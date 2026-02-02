import Fastify, { FastifyServerOptions } from 'fastify'
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod'
import fastifyRateLimit from '@fastify/rate-limit'
import { setupErrorHandler } from './error-handler.ts'
import { setupSwagger, setupSwaggerSecurityHook } from './swagger-setup.ts'
import { setupJWT } from './jwt/setup.ts'
import type { CreateFastifyOptions, FastifyServer } from './types.ts'

// Re-export types and utilities from other modules
export * from './response.ts'
export * from './types.ts'

export async function createFastify(options?: CreateFastifyOptions): Promise<FastifyServer> {
  const fastifyOptions: FastifyServerOptions = {}

  if (options?.logger) {
    fastifyOptions.loggerInstance = options.logger
  }

  const fastify = Fastify(fastifyOptions).withTypeProvider<ZodTypeProvider>()

  // Set up Zod validation and serialization
  fastify.setValidatorCompiler(validatorCompiler)
  fastify.setSerializerCompiler(serializerCompiler)

  // Set up error handler for standardized error responses
  setupErrorHandler(fastify)

  // Register Swagger first to capture all routes with Zod schemas
  const swaggerRoutePrefix = await setupSwagger(fastify, options || {})

  // Auto-inject security requirements for JWT-protected routes
  setupSwaggerSecurityHook(fastify, options || {}, swaggerRoutePrefix)

  // Register JWT authentication
  await setupJWT(fastify, options || {}, swaggerRoutePrefix)

  // Register Rate Limiting
  if (options?.rateLimit?.global) {
    await fastify.register(fastifyRateLimit, {
      global: true,
      ...options.rateLimit.global,
    })
  }

  return fastify
}

export async function runFastify(fastify: FastifyServer, host: string, port: number) {
  try {
    await fastify.listen({ host, port })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
