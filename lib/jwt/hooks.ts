import type { FastifyReply, FastifyRequest } from 'fastify'
import { formatError } from '../response.ts'
import type { FastifyJwtService } from './service.ts'

interface HookOptions {
  jwtService: FastifyJwtService
  swaggerRoutePrefix?: string
  requiredTypes?: string[]
  debug?: boolean
}

export function createVerificationHook(options: HookOptions) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { jwtService, swaggerRoutePrefix, requiredTypes, debug } = options

    // Skip Swagger routes
    if (swaggerRoutePrefix && request.url.startsWith(swaggerRoutePrefix)) {
      return
    }

    const routeConfig = (request.routeOptions.config as any) || {}
    const jwtTypes = routeConfig.jwtTypes

    // If jwtTypes is explicitly false, skip verification
    if (jwtTypes === false) {
      return
    }

    // Determine which token types to verify
    // Always include requiredTypes first (checked for all routes)
    let typesToVerify: string[] = []

    if (requiredTypes && requiredTypes.length > 0) {
      typesToVerify = [...requiredTypes]
    }

    // Add route-specific types if specified
    if (Array.isArray(jwtTypes) && jwtTypes.length > 0) {
      // Combine both, removing duplicates
      typesToVerify = [...new Set([...typesToVerify, ...jwtTypes])]
    }

    // If no types to verify, route is public
    if (typesToVerify.length === 0) {
      return
    }

    // Initialize jwtPayloads map on request
    request.jwtPayloads = new Map()

    // Verify each required token type
    for (const typeName of typesToVerify) {
      const tokenTypeConfig = jwtService.getTokenTypeConfig(typeName)
      if (!tokenTypeConfig) {
        const errorMsg = debug
          ? `Unknown token type "${typeName}" in route configuration. Available types: ${jwtService.getTokenTypeNames().join(', ')}`
          : `Unknown token type "${typeName}"`
        return reply.status(500).send(formatError(500, 'Internal Server Error', errorMsg))
      }

      // Extract token from configured header
      const headerName = tokenTypeConfig.headerName.toLowerCase()
      const headerValue = request.headers[headerName]

      let token: string | null = null
      try {
        token = jwtService.extractTokenFromHeader(headerValue, typeName)
      } catch (err) {
        const errorMsg = debug && err instanceof Error
          ? err.message
          : `Invalid ${headerName} header format`
        return reply.status(401).send(formatError(401, 'Unauthorized', errorMsg))
      }

      if (!token) {
        const errorMsg = debug
          ? `Missing or invalid ${headerName} header for token type "${typeName}"`
          : `Missing or invalid ${headerName} header`
        return reply.status(401).send(formatError(401, 'Unauthorized', errorMsg))
      }

      // Verify token
      try {
        const payload = jwtService.verifyToken(typeName, token)
        request.jwtPayloads.set(typeName, payload)
      } catch (err) {
        const errorMsg = debug && err instanceof Error
          ? `Token verification failed for type "${typeName}": ${err.message}`
          : `Invalid or expired ${typeName} token`
        return reply.status(401).send(formatError(401, 'Unauthorized', errorMsg))
      }
    }
  }
}
