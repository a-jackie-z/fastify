import { signToken, verifyToken, extractTokenFromHeader, type SignTokenOptions, type VerifyTokenOptions } from './core.ts'
import type { TokenTypeConfig } from '../types.ts'

export interface FastifyJwtServiceOptions {
  secrets: Record<string, string>
  defaultKeyId: string
  tokenTypes: Record<string, TokenTypeConfig>
  debug?: boolean
}

export class FastifyJwtService {
  private readonly secrets: Record<string, string>
  private readonly defaultKeyId: string
  private readonly tokenTypes: Record<string, TokenTypeConfig>
  private readonly debug: boolean

  constructor(options: FastifyJwtServiceOptions) {
    this.secrets = options.secrets
    this.defaultKeyId = options.defaultKeyId
    this.tokenTypes = options.tokenTypes
    this.debug = options.debug ?? false
  }

  /**
   * Generate a token for a specific type
   */
  generateToken(typeName: string, payload: Record<string, any>): string {
    const tokenType = this.tokenTypes[typeName]
    if (!tokenType) {
      throw new Error(
        this.debug
          ? `Unknown token type "${typeName}". Available types: ${Object.keys(this.tokenTypes).join(', ')}`
          : `Unknown token type "${typeName}"`
      )
    }

    const signOptions: SignTokenOptions = {}
    if (tokenType.algorithm) signOptions.algorithm = tokenType.algorithm
    if (tokenType.iss) signOptions.iss = tokenType.iss
    if (tokenType.aud) signOptions.aud = tokenType.aud
    if (tokenType.header) signOptions.header = tokenType.header

    const secret = this.secrets[this.defaultKeyId]
    if (!secret) {
      throw new Error(`Default key ID "${this.defaultKeyId}" not found in secrets`)
    }

    return signToken(payload, secret, this.defaultKeyId, tokenType.expiresIn, signOptions)
  }

  /**
   * Verify a token for a specific type
   */
  verifyToken(typeName: string, token: string): any {
    const tokenType = this.tokenTypes[typeName]
    if (!tokenType) {
      throw new Error(
        this.debug
          ? `Unknown token type "${typeName}". Available types: ${Object.keys(this.tokenTypes).join(', ')}`
          : `Unknown token type "${typeName}"`
      )
    }

    const verifyOptions: VerifyTokenOptions = {
      debug: this.debug,
    }

    if (tokenType.allowedIss && tokenType.allowedIss.length > 0) {
      verifyOptions.allowedIss = tokenType.allowedIss
    }

    if (tokenType.header) {
      verifyOptions.expectedHeader = tokenType.header
    }

    const decoded = verifyToken(token, this.secrets, verifyOptions)

    // Validate payload with Zod schema if provided
    if (tokenType.payloadSchema) {
      try {
        return tokenType.payloadSchema.parse(decoded)
      } catch (error) {
        if (this.debug && error instanceof Error) {
          throw new Error(`Token payload validation failed: ${error.message}`)
        }
        throw new Error('Invalid token payload')
      }
    }

    return decoded
  }

  /**
   * Extract token from header value
   */
  extractTokenFromHeader(headerValue: string | string[] | undefined, typeName: string): string | null {
    const tokenType = this.tokenTypes[typeName]
    if (!tokenType) {
      throw new Error(
        this.debug
          ? `Unknown token type "${typeName}". Available types: ${Object.keys(this.tokenTypes).join(', ')}`
          : `Unknown token type "${typeName}"`
      )
    }

    return extractTokenFromHeader(headerValue, tokenType.headerName, this.debug)
  }

  /**
   * Get token type configuration
   */
  getTokenTypeConfig(typeName: string): TokenTypeConfig | undefined {
    return this.tokenTypes[typeName]
  }

  /**
   * Get all configured token type names
   */
  getTokenTypeNames(): string[] {
    return Object.keys(this.tokenTypes)
  }
}

