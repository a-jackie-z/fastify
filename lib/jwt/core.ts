import jwt, { Algorithm, JwtPayload, SignOptions, VerifyOptions } from 'jsonwebtoken'

export interface SignTokenOptions {
  algorithm?: Algorithm
  iss?: string
  aud?: string
  header?: {
    typ?: string
    cty?: string
    [key: string]: any
  }
}

export interface VerifyTokenOptions {
  allowedIss?: string[]
  debug?: boolean
  expectedHeader?: {
    typ?: string
    cty?: string
    [key: string]: any
  }
}

/**
 * Sign a JWT token with kid, expiration, and optional JWT header parameters
 */
export function signToken(
  payload: Record<string, any>,
  secret: string,
  kid: string,
  expiresIn: string,
  options?: SignTokenOptions
): string {
  const signOptions: SignOptions = {
    expiresIn: expiresIn as any,
    keyid: kid,
  }

  if (options?.algorithm) {
    signOptions.algorithm = options.algorithm
  }
  if (options?.iss) {
    signOptions.issuer = options.iss
  }
  if (options?.aud) {
    signOptions.audience = options.aud
  }

  // Apply custom header configuration
  if (options?.header) {
    const headerConfig: Record<string, any> = {}

    // Add standard JWT headers
    if (options.header.typ !== undefined) {
      headerConfig.typ = options.header.typ
    }
    if (options.header.cty !== undefined) {
      headerConfig.cty = options.header.cty
    }

    // Add custom header claims (exclude typ and cty as they're already handled)
    for (const [key, value] of Object.entries(options.header)) {
      if (key !== 'typ' && key !== 'cty') {
        headerConfig[key] = value
      }
    }

    // Only set header if we have custom fields
    if (Object.keys(headerConfig).length > 0) {
      signOptions.header = headerConfig as any
    }
  }

  return jwt.sign(payload, secret, signOptions)
}

/**
 * Verify a JWT token with kid-based secret selection and optional issuer validation
 */
export function verifyToken(
  token: string,
  secrets: Record<string, string>,
  options?: VerifyTokenOptions
): JwtPayload {
  const debug = options?.debug ?? false

  try {
    // Decode header to extract kid
    const parts = token.split('.')
    if (parts.length !== 3 || !parts[0]) {
      throw new Error(debug ? 'Malformed JWT token: Token must have 3 parts separated by dots' : 'Malformed token')
    }

    const headerPart = parts[0]
    let header: any
    try {
      header = JSON.parse(Buffer.from(headerPart, 'base64').toString())
    } catch {
      throw new Error(debug ? 'Malformed JWT token: Invalid base64 encoding in header' : 'Malformed token')
    }

    const kid = header.kid
    if (!kid) {
      throw new Error(
        debug
          ? 'Missing kid in JWT token header. Ensure the token was signed with a kid parameter.'
          : 'Missing kid in token header'
      )
    }

    // Validate expected header claims if configured
    if (options?.expectedHeader) {
      // Validate typ (token type)
      if (options.expectedHeader.typ !== undefined && header.typ !== options.expectedHeader.typ) {
        throw new Error(
          debug
            ? `Invalid JWT header 'typ': expected "${options.expectedHeader.typ}", got "${header.typ || 'undefined'}"`
            : 'Invalid JWT header typ'
        )
      }

      // Validate cty (content type)
      if (options.expectedHeader.cty !== undefined && header.cty !== options.expectedHeader.cty) {
        throw new Error(
          debug
            ? `Invalid JWT header 'cty': expected "${options.expectedHeader.cty}", got "${header.cty || 'undefined'}"`
            : 'Invalid JWT header cty'
        )
      }

      // Validate custom header claims
      for (const [key, expectedValue] of Object.entries(options.expectedHeader)) {
        if (key !== 'typ' && key !== 'cty' && expectedValue !== undefined) {
          if (header[key] !== expectedValue) {
            throw new Error(
              debug
                ? `Invalid JWT header '${key}': expected "${expectedValue}", got "${header[key] || 'undefined'}"`
                : `Invalid JWT header ${key}`
            )
          }
        }
      }
    }

    const secret = secrets[kid]
    if (!secret) {
      const availableKeys = Object.keys(secrets).join(', ')
      throw new Error(
        debug
          ? `Unknown key ID "${kid}" in JWT token. Available keys: ${availableKeys}`
          : `Unknown key ID "${kid}"`
      )
    }

    // Verify token with the secret
    const verifyOptions: VerifyOptions = {
      complete: false,
    }

    const decoded = jwt.verify(token, secret, verifyOptions) as JwtPayload

    // Validate issuer if allowedIss is configured
    if (options?.allowedIss && options.allowedIss.length > 0) {
      const tokenIss = decoded.iss
      if (!tokenIss) {
        throw new Error(
          debug
            ? `Token missing issuer (iss) claim. Expected one of: ${options.allowedIss.join(', ')}`
            : 'Token missing issuer claim'
        )
      }
      if (!options.allowedIss.includes(tokenIss)) {
        throw new Error(
          debug
            ? `Invalid token issuer "${tokenIss}". Expected one of: ${options.allowedIss.join(', ')}`
            : `Invalid token issuer "${tokenIss}"`
        )
      }
    }

    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      if (debug) {
        const expDate = new Date(error.expiredAt).toISOString()
        const now = Math.floor(Date.now() / 1000)
        const exp = Math.floor(error.expiredAt.getTime() / 1000)
        const diff = now - exp
        throw new Error(`Token expired at ${expDate} (${diff} seconds ago)`)
      }
      throw new Error('Token has expired')
    }

    if (error instanceof jwt.JsonWebTokenError) {
      if (debug) {
        if (error.message.includes('signature')) {
          throw new Error('Invalid token signature: Token was signed with a different secret or has been tampered with')
        }
        if (error.message.includes('malformed')) {
          throw new Error('Malformed token: Token structure is invalid or corrupted')
        }
        throw new Error(`Token verification failed: ${error.message}`)
      }
      throw new Error('Invalid token')
    }

    throw error
  }
}

/**
 * Extract token from header value with Bearer prefix stripping
 * All JWT tokens must use Bearer prefix format: "Bearer <token>"
 */
export function extractTokenFromHeader(
  headerValue: string | string[] | undefined,
  headerName: string,
  debug?: boolean
): string | null {
  if (!headerValue) {
    return null
  }

  const value = typeof headerValue === 'string' ? headerValue : headerValue[0]
  if (!value) {
    return null
  }

  // All JWT tokens must use "Bearer <token>" format
  const match = value.match(/^Bearer\s+(\S+)$/i)
  if (!match || !match[1]) {
    if (debug && value) {
      throw new Error(`Invalid ${headerName} header format. Expected: "Bearer <token>"`)
    }
    return null
  }

  return match[1]
}

