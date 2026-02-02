import type { FastifyInstance } from 'fastify'
import { FastifyJwtService, type FastifyJwtServiceOptions } from './service.ts'

export async function registerJWT(
  fastify: FastifyInstance,
  options: FastifyJwtServiceOptions
): Promise<FastifyJwtService> {
  const { secrets, defaultKeyId, tokenTypes } = options

  // Validate that defaultKeyId exists in secrets
  if (!secrets[defaultKeyId]) {
    throw new Error(`Default key ID "${defaultKeyId}" not found in JWT secrets`)
  }

  // Validate that at least one token type is configured
  if (!tokenTypes || Object.keys(tokenTypes).length === 0) {
    throw new Error('At least one token type must be configured')
  }

  // Validate token types configuration
  for (const [typeName, config] of Object.entries(tokenTypes)) {
    if (!config.headerName) {
      throw new Error(`Token type "${typeName}" is missing required field: headerName`)
    }
    if (!config.expiresIn) {
      throw new Error(`Token type "${typeName}" is missing required field: expiresIn`)
    }
  }

  // Create JWT service
  const jwtService = new FastifyJwtService(options)

  // Decorate Fastify instance
  fastify.decorate('jwtService', jwtService)

  return jwtService
}
