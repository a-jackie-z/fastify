import type {
  FastifyBaseLogger,
  FastifyContextConfig,
  FastifyInstance,
  FastifyServerOptions,
  RawServerDefault,
} from 'fastify'
import type { RateLimitPluginOptions } from '@fastify/rate-limit'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { TokenTypeConfig } from '@a_jackie_z/fastify-types'
import { FastifyJwtService } from './jwt/index.ts'


// Extend Fastify types to include custom config
declare module 'fastify' {
  interface FastifyContextConfig {
    jwtTypes?: string[] | false
  }
  interface FastifyInstance {
    jwtService: FastifyJwtService
  }
  interface FastifyRequest {
    jwtPayloads: Map<string, any>
  }
}

export interface CreateFastifyOptions {
  logger?: FastifyServerOptions['loggerInstance'],
  requestTimeout?: number,
  bodyLimit?: number,
  rateLimit?: {
    global?: RateLimitPluginOptions
  }
  jwt?: {
    secrets: Record<string, string>
    defaultKeyId: string
    tokenTypes: Record<string, TokenTypeConfig>
    requiredTypes?: string[]
    debug?: boolean
  }
  swagger?: {
    title: string
    version: string
    description: string
    routePrefix?: string
  }
}

export type FastifyServer = FastifyInstance<
  RawServerDefault,
  IncomingMessage,
  ServerResponse,
  FastifyBaseLogger,
  ZodTypeProvider
> & FastifyContextConfig
