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
import type { Algorithm } from 'jsonwebtoken'
import type { z } from 'zod'
import { FastifyJwtService } from './jwt/index.ts'

export interface TokenTypeConfig {
  headerName: string
  expiresIn: string
  payloadSchema?: z.ZodSchema<any>
  algorithm?: Algorithm
  iss?: string
  aud?: string
  allowedIss?: string[]
  header?: {
    typ?: string                    // Token type (typically 'JWT')
    cty?: string                    // Content type (e.g., 'application/json')
    [key: string]: any              // Custom header claims
  }
}

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
