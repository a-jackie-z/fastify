import type { FastifyInstance } from 'fastify'
import fastifySwagger, { SwaggerOptions } from '@fastify/swagger'
import fastifySwaggerUI, { FastifySwaggerUiOptions } from '@fastify/swagger-ui'
import { jsonSchemaTransform } from 'fastify-type-provider-zod'
import type { CreateFastifyOptions } from './types.ts'

export async function setupSwagger(
  fastify: FastifyInstance,
  options: CreateFastifyOptions
): Promise<string | undefined> {
  if (!options.swagger) {
    return undefined
  }

  const openApiConfig: any = {
    openapi: {
      info: {
        title: options.swagger.title,
        version: options.swagger.version,
        description: options.swagger.description,
      },
    },
    transform: jsonSchemaTransform,
  }

  // Add security schemes for each token type if JWT is enabled
  if (options.jwt && options.jwt.tokenTypes) {
    const securitySchemes: any = {}

    for (const [typeName, typeConfig] of Object.entries(options.jwt.tokenTypes)) {
      const headerName = typeConfig.headerName.toLowerCase()

      // Use bearer auth for 'authorization' header, apiKey for custom headers
      if (headerName === 'authorization') {
        securitySchemes[typeName] = {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: `JWT token for ${typeName} authentication`,
        }
      } else {
        securitySchemes[typeName] = {
          type: 'apiKey',
          in: 'header',
          name: typeConfig.headerName,
          description: `JWT token for ${typeName} authentication`,
        }
      }
    }

    openApiConfig.openapi.components = {
      securitySchemes,
    }
  }

  await fastify.register(fastifySwagger, openApiConfig as SwaggerOptions)

  let routePrefix = options.swagger.routePrefix || '/docs/'

  if (!routePrefix.startsWith('/')) {
    routePrefix = '/' + routePrefix
  }

  if (!routePrefix.endsWith('/')) {
    routePrefix = routePrefix + '/'
  }

  await fastify.register(fastifySwaggerUI, { routePrefix } as FastifySwaggerUiOptions)

  return routePrefix
}

export function setupSwaggerSecurityHook(
  fastify: FastifyInstance,
  options: CreateFastifyOptions,
  swaggerRoutePrefix: string | undefined
): void {
  if (!options.jwt || !options.swagger) {
    return
  }

  // Auto-inject security requirements for JWT-protected routes
  fastify.addHook('onRoute', (routeOptions) => {
    // Skip Swagger routes
    if (swaggerRoutePrefix && routeOptions.url.startsWith(swaggerRoutePrefix)) {
      return
    }

    const routeConfig = (routeOptions.config as any) || {}
    const jwtTypes = routeConfig.jwtTypes

    // Skip if JWT is explicitly bypassed
    if (jwtTypes === false) {
      return
    }

    // Determine which token types are required
    // Start with global requiredTypes (always checked)
    let requiredTypes: string[] = []

    if (options.jwt?.requiredTypes && options.jwt.requiredTypes.length > 0) {
      requiredTypes = [...options.jwt.requiredTypes]
    }

    // Add route-specific types if specified
    if (Array.isArray(jwtTypes) && jwtTypes.length > 0) {
      // Combine both, removing duplicates
      requiredTypes = [...new Set([...requiredTypes, ...jwtTypes])]
    }

    // Inject security requirement if JWT types are required
    if (requiredTypes.length > 0) {
      if (!routeOptions.schema) {
        routeOptions.schema = {}
      }
      if (!routeOptions.schema.security) {
        routeOptions.schema.security = requiredTypes.map(typeName => ({ [typeName]: [] }))
      }
    }
  })
}
