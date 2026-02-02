import type { FastifyInstance } from 'fastify'
import type { CreateFastifyOptions } from '../types.ts'
import { registerJWT } from './register.ts'
import { createVerificationHook } from './hooks.ts'

export async function setupJWT(
  fastify: FastifyInstance,
  options: CreateFastifyOptions,
  swaggerRoutePrefix: string | undefined
): Promise<void> {
  if (!options.jwt) {
    return
  }

  const jwtService = await registerJWT(fastify, {
    secrets: options.jwt.secrets,
    defaultKeyId: options.jwt.defaultKeyId,
    tokenTypes: options.jwt.tokenTypes,
    debug: options.jwt.debug ?? false,
  })

  // Add verification hook for JWT verification (always add when JWT configured)
  const hookOptions: Parameters<typeof createVerificationHook>[0] = {
    jwtService,
    debug: options.jwt.debug ?? false,
  }

  if (options.jwt.requiredTypes !== undefined) {
    hookOptions.requiredTypes = options.jwt.requiredTypes
  }

  if (swaggerRoutePrefix !== undefined) {
    hookOptions.swaggerRoutePrefix = swaggerRoutePrefix
  }

  fastify.addHook('onRequest', createVerificationHook(hookOptions))
}
