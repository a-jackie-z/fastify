# @a_jackie_z/fastify

A collection of Fastify plugins and utilities for building robust web applications with built-in support for dynamic JWT authentication, rate limiting, Swagger documentation, and Zod validation.

## Installation

```bash
# For server-side Fastify applications
npm install @a_jackie_z/fastify

# For frontend applications (types and schemas only)
npm install @a_jackie_z/fastify-types
```

> **Note:** If you're building a frontend application (React, Vue, etc.) and only need API types and response schemas, install `@a_jackie_z/fastify-types` instead. It's frontend-compatible and has no Node.js dependencies.

## Quick Start

### Basic Setup

```typescript
import { createFastify, runFastify } from '@a_jackie_z/fastify'
import { formatSuccess } from '@a_jackie_z/fastify-types'
import { z } from 'zod'

const app = await createFastify()

app.route({
  method: 'GET',
  url: '/hello',
  schema: {
    response: {
      200: z.object({
        status: z.number(),
        success: z.boolean(),
        data: z.object({
          message: z.string(),
        }),
      }),
    },
  },
  handler: async (_request, reply) => {
    return reply.send(formatSuccess(200, { message: 'Hello World!' }))
  },
})

await runFastify(app, '0.0.0.0', 3000)
```

## Package Architecture

This package is split into two complementary packages for better frontend compatibility:

### `@a_jackie_z/fastify` (Server Package)
**For:** Node.js server applications
**Includes:**
- Fastify server creation and configuration (`createFastify`, `runFastify`)
- JWT service with token generation/verification (`FastifyJwtService`)
- Server-side crypto utilities (`generateId`, `generateSessionToken`)
- Fastify plugins and middleware
- Server-specific types (`CreateFastifyOptions`, `FastifyServer`)

### `@a_jackie_z/fastify-types` (Types Package)  
**For:** Frontend applications (React, Vue, etc.) and API contracts
**Includes:**
- Response types (`SuccessResponse`, `ErrorResponse`, `ValidationDetail`)
- Response formatters (`formatSuccess`, `formatError`)  
- Zod schemas (`successResponseSchema`, `errorResponseSchema`)
- JWT configuration types (`TokenTypeConfig`, `SignTokenOptions`)
- Error utilities (`createError`, `HTTP_STATUS_CODES`)
- No Node.js dependencies - browser compatible

```typescript
// Server code
import { createFastify, generateId } from '@a_jackie_z/fastify'
import { formatSuccess } from '@a_jackie_z/fastify-types'

// Frontend code  
import { successResponseSchema, type SuccessResponse } from '@a_jackie_z/fastify-types'
```

## Features

- **Dynamic JWT Authentication** - Flexible multi-token-type JWT system with per-type configuration
- **Multiple Secret Keys** - Support for key rotation with kid-based secret selection
- **Per-Type Token Configuration** - Configure header names, expiration, algorithm, issuer per token type
- **Issuer Validation** - Optional allowedIss validation for enhanced security
- **Payload Schema Validation** - Zod schema validation for token payloads
- **Flexible Route Protection** - Combine global required types with route-specific types
- **Rate Limiting** - Global rate limiting for API protection
- **Swagger Documentation** - Auto-generated API documentation with dynamic security schemes
- **Zod Integration** - Type-safe request/response validation
- **Standardized Response Formatting** - Consistent response shapes with `formatSuccess` and `formatError` utilities
- **Automatic Error Handling** - Field-level validation errors, auth errors, and rate limit errors with consistent formatting
- **Custom Logger Support** - Integrate any Fastify-compatible logger
- **Health Check Plugin** - Ready-to-use health check endpoint
- **Plugin Helper** - Utility for creating reusable Fastify plugins

## Examples

### 1. Complete Setup with All Features

```typescript
import { createFastify, runFastify } from '@a_jackie_z/fastify'
import { z } from 'zod'

const app = await createFastify({
  // Optional: Integrate your logger
  // logger: yourFastifyLogger,
  
  // Rate limiting
  rateLimit: {
    global: {
      max: 100,
      timeWindow: '1 minute',
    },
  },
  
  // Dynamic JWT authentication with multiple token types
  jwt: {
    // Multiple secrets for key rotation
    secrets: {
      v1: 'your-secret-key-v1',
      v2: 'your-secret-key-v2',
    },
    defaultKeyId: 'v2', // Use v2 for signing new tokens
    
    // Define token types with individual configurations
    tokenTypes: {
      access: {
        headerName: 'authorization',
        expiresIn: '15m',
        algorithm: 'HS256',
        iss: 'auth-service',
        allowedIss: ['auth-service'],
        payloadSchema: z.object({
          identityId: z.string(),
          role: z.string().optional(),
        }),
      },
      refresh: {
        headerName: 'authorization',
        expiresIn: '7d',
        algorithm: 'HS256',
      },
      service: {
        headerName: 'x-service-authorization',
        expiresIn: '1h',
        algorithm: 'HS256',
        iss: 'gateway',
        allowedIss: ['gateway', 'internal-service'],
      },
    },
    
    // Token types always checked (unless route has jwtTypes: false)
    requiredTypes: ['service'],
    
    debug: true, // Enable detailed error messages in development
  },
  
  // Swagger documentation
  swagger: {
    title: 'My API',
    version: '1.0.0',
    description: 'API documentation',
    routePrefix: '/docs',
  },
})

await runFastify(app, '0.0.0.0', 3000)
```

## JWT Authentication

### Overview

The JWT system supports **dynamic token types** where each type can have its own:
- Header name (e.g., `authorization`, `x-service-authorization`)
- Expiration time
- JWT algorithm, issuer (iss), and audience (aud)
- Allowed issuers for verification
- Zod schema for payload validation

### Token Type Configuration

Each token type is configured independently:

```typescript
// TokenTypeConfig is available in @a_jackie_z/fastify-types
import type { TokenTypeConfig } from '@a_jackie_z/fastify-types'

interface TokenTypeConfig {
  headerName: string          // Header to extract token from
  expiresIn: string          // Token expiration (e.g., '15m', '7d', '1h')
  payloadSchema?: z.ZodSchema // Optional Zod schema for payload validation
  algorithm?: Algorithm       // JWT signing algorithm (default: 'HS256')
  iss?: string               // Token issuer
  aud?: string               // Token audience
  allowedIss?: string[]      // Allowed issuers for verification (bypass if undefined)
  header?: {                 // Optional JWT header configuration
    typ?: string             // Token type (typically 'JWT')
    cty?: string             // Content type (e.g., 'application/json')
    [key: string]: any       // Custom header claims
  }
}
```

### Multiple Secret Keys (Key Rotation)

Support multiple secrets for key rotation using kid-based selection:

```typescript
jwt: {
  secrets: {
    v1: 'old-secret-key',
    v2: 'new-secret-key',
    v3: 'future-secret-key',
  },
  defaultKeyId: 'v2', // New tokens signed with v2
  // Tokens with kid=v1, v2, or v3 can all be verified
}
```

### Route Protection

Routes can specify which token types they require:

```typescript
// Public route - no authentication
app.get('/public', {
  config: { jwtTypes: false }
}, handler)

// Protected by access token only
app.get('/user-data', {
  config: { jwtTypes: ['access'] }
}, handler)

// Protected by both access and service tokens
app.get('/gateway-protected', {
  config: { jwtTypes: ['access', 'service'] }
}, handler)

// No config - uses requiredTypes from global config
app.get('/auto-protected', handler)
```

### Global Required Types

The `requiredTypes` option specifies token types that are **ALWAYS** checked on all routes (unless explicitly bypassed with `jwtTypes: false`):

```typescript
jwt: {
  requiredTypes: ['service'], // Always verify service token
  tokenTypes: { /* ... */ }
}

// Route A: No jwtTypes specified
// Verifies: ['service']
app.get('/api/data', handler)

// Route B: jwtTypes: ['access']
// Verifies: ['service', 'access'] (both combined!)
app.get('/api/user', { config: { jwtTypes: ['access'] } }, handler)

// Route C: jwtTypes: false
// Verifies: nothing (explicitly public)
app.get('/public', { config: { jwtTypes: false } }, handler)
```

### 2. Authentication Flow - Login Route

```typescript
import { formatSuccess, formatError } from '@a_jackie_z/fastify-types'

app.route({
  method: 'POST',
  url: '/auth/login',
  config: {
    jwtTypes: false, // Public route
  },
  schema: {
    body: z.object({
      username: z.string(),
      password: z.string(),
    }),
    response: {
      200: z.object({
        status: z.number(),
        success: z.boolean(),
        data: z.object({
          accessToken: z.string(),
          refreshToken: z.string(),
        }),
      }),
      401: z.object({
        status: z.number(),
        success: z.boolean(),
        error: z.string(),
        message: z.string(),
      }),
    },
  },
  handler: async (request, reply) => {
    const { username, password } = request.body

    // Validate credentials
    if (username === 'admin' && password === 'secret') {
      // Generate tokens using jwtService
      const accessToken = app.jwtService.generateToken('access', {
        identityId: 'user-123',
        role: 'admin',
      })
      
      const refreshToken = app.jwtService.generateToken('refresh', {
        identityId: 'user-123',
      })
      
      return reply.send(formatSuccess(200, { accessToken, refreshToken }))
    }

    return reply.status(401).send(
      formatError(401, 'Unauthorized', 'Invalid credentials')
    )
  },
})
```

### 3. Protected Route - Accessing JWT Payloads

```typescript
app.route({
  method: 'GET',
  url: '/user/profile',
  config: {
    jwtTypes: ['access'], // Requires access token (+ any global requiredTypes)
  },
  schema: {
    response: {
      200: z.object({
        status: z.number(),
        success: z.boolean(),
        data: z.object({
          identityId: z.string(),
          role: z.string(),
        }),
      }),
    },
  },
  handler: async (request, reply) => {
    // Access verified token payloads from Map
    const accessPayload = request.jwtPayloads.get('access')
    const servicePayload = request.jwtPayloads.get('service') // If in requiredTypes
    
    return reply.send(formatSuccess(200, {
      identityId: accessPayload.identityId,
      role: accessPayload.role,
    }))
  },
})
```

### 4. Service-to-Service Authentication

Configure service tokens for microservice communication:

```typescript
jwt: {
  tokenTypes: {
    service: {
      headerName: 'x-service-authorization',
      expiresIn: '1h',
      algorithm: 'HS256',
      iss: 'gateway',
      allowedIss: ['gateway', 'auth-service'],
      payloadSchema: z.object({
        serviceId: z.string(),
      }),
    },
  },
  requiredTypes: ['service'], // All routes require service token
}

// Gateway generates service token
const serviceToken = app.jwtService.generateToken('service', {
  serviceId: 'gateway',
})

// Forward to backend service with service token
fetch('http://backend-service/api/data', {
  headers: {
    'Authorization': `Bearer ${userAccessToken}`,
    'X-Service-Authorization': serviceToken, // No Bearer prefix for custom headers
  },
})
```

### 5. Token Refresh Flow

```typescript
app.route({
  method: 'POST',
  url: '/auth/refresh',
  config: {
    jwtTypes: false, // Public endpoint
  },
  schema: {
    body: z.object({
      refreshToken: z.string(),
    }),
  },
  handler: async (request, reply) => {
    const { refreshToken } = request.body
    
    try {
      // Verify refresh token
      const payload = app.jwtService.verifyToken('refresh', refreshToken)
      
      // Generate new tokens
      const newAccessToken = app.jwtService.generateToken('access', {
        identityId: payload.identityId,
      })
      
      const newRefreshToken = app.jwtService.generateToken('refresh', {
        identityId: payload.identityId,
      })
      
      return reply.send(formatSuccess(200, {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      }))
    } catch (err) {
      return reply.status(401).send(
        formatError(401, 'Unauthorized', 'Invalid or expired refresh token')
      )
    }
  },
})
```

### 6. Custom Authorization Logic

Implement custom authorization in route handlers:

```typescript
app.route({
  method: 'DELETE',
  url: '/admin/users/:id',
  config: {
    jwtTypes: ['access'],
  },
  handler: async (request, reply) => {
    const accessPayload = request.jwtPayloads.get('access')
    
    // Check role
    if (accessPayload.role !== 'admin') {
      return reply.status(403).send(
        formatError(403, 'Forbidden', 'Admin role required')
      )
    }
    
    // Check permissions
    if (!accessPayload.permissions?.includes('delete')) {
      return reply.status(403).send(
        formatError(403, 'Forbidden', 'Delete permission required')
      )
    }
    
    // Proceed with deletion
    const { id } = request.params
    await deleteUser(id)
    
    return reply.send(formatSuccess(200, { message: 'User deleted' }))
  },
})
```

### 7. Issuer Validation

Enforce issuer validation for enhanced security:

```typescript
jwt: {
  tokenTypes: {
    access: {
      headerName: 'authorization',
      expiresIn: '15m',
      iss: 'auth-service',              // Tokens generated with iss='auth-service'
      allowedIss: ['auth-service'],     // Only accept tokens from auth-service
    },
    service: {
      headerName: 'x-service-authorization',
      expiresIn: '1h',
      iss: 'gateway',
      allowedIss: ['gateway', 'legacy-gateway'], // Accept from multiple sources
    },
  },
}

// If allowedIss is undefined, issuer validation is bypassed
```

### 8. Payload Schema Validation

Define Zod schemas for runtime payload validation:

```typescript
import { z } from 'zod'

jwt: {
  tokenTypes: {
    access: {
      headerName: 'authorization',
      expiresIn: '15m',
      payloadSchema: z.object({
        identityId: z.string().uuid(),
        role: z.enum(['user', 'admin', 'moderator']),
        permissions: z.array(z.string()).optional(),
        exp: z.number(), // JWT standard field
      }),
    },
  },
}

// Tokens with invalid payloads will be rejected during verification
```

### 9. JWT Header Configuration

Configure standard and custom JWT header claims per token type:

```typescript
import { z } from 'zod'

jwt: {
  tokenTypes: {
    access: {
      headerName: 'authorization',
      expiresIn: '15m',
      algorithm: 'HS256',
      header: {
        typ: 'JWT',                    // Standard: Token type
        cty: 'application/json',       // Standard: Content type
        ver: '2.0',                    // Custom: API version
        ctx: 'web',                    // Custom: Client context
      },
    },
    service: {
      headerName: 'x-service-authorization',
      expiresIn: '1h',
      algorithm: 'HS256',
      header: {
        typ: 'JWT',
        env: 'production',             // Custom: Environment
      },
    },
  },
}

// Generated tokens will include these headers
// Verification will validate headers match the configuration
```

**Standard JWT Headers:**
- `typ` - Token type (typically 'JWT')
- `cty` - Content type for nested JWTs or specific content
- `alg` - Algorithm (set via `algorithm` field)
- `kid` - Key ID (automatically set from `defaultKeyId`)

**Custom Headers:**
- Any additional key-value pairs for application-specific needs
- Examples: `ver` (version), `ctx` (context), `env` (environment), `app` (application ID)

**Header Validation:**
- During token verification, headers are validated against the configured values
- Tokens with mismatched headers will be rejected
- Provides additional security layer for token authenticity

### 10. Health Check Plugin

```typescript
import { createFastify, runFastify, healthPlugin } from '@a_jackie_z/fastify'

const app = await createFastify()

// Register health check plugin
await app.register(healthPlugin)

// Health endpoint available at: GET /v1/health
// Response: { status: 200, message: 'ok' }

await runFastify(app, '0.0.0.0', 3000)
```

### 10. Creating Custom Plugins

```typescript
import { createFastify, runFastify, createFastifyPlugin } from '@a_jackie_z/fastify'
import { z } from 'zod'

// Create a reusable plugin
const myPlugin = createFastifyPlugin((app) => {
  app.get('/plugin-route', {
    schema: {
      response: {
        200: z.object({
          message: z.string(),
        }),
      },
    },
    handler: async () => {
      return { message: 'From plugin' }
    },
  })
})

// Use the plugin
const app = await createFastify()
await app.register(myPlugin)

await runFastify(app, '0.0.0.0', 3000)
```

### 11. Zod Schema Validation

```typescript
app.route({
  method: 'POST',
  url: '/users',
  schema: {
    body: z.object({
      name: z.string().min(1).max(100),
      email: z.string().email(),
      age: z.number().min(0).max(150).optional(),
    }),
    response: {
      201: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
      }),
      400: z.object({
        error: z.string(),
      }),
    },
  },
  handler: async (request, reply) => {
    const user = request.body
    reply.status(201)
    return {
      id: 'generated-id',
      ...user,
    }
  },
})
```

### 12. Response Formatting

All responses should follow a consistent format using the provided utility functions:

#### Success Response Format

```typescript
import { formatSuccess } from '@a_jackie_z/fastify-types'

app.route({
  method: 'GET',
  url: '/users/:id',
  schema: {
    params: z.object({
      id: z.string(),
    }),
    response: {
      200: z.object({
        status: z.number(),
        success: z.boolean(),
        data: z.object({
          id: z.string(),
          name: z.string(),
          email: z.string(),
        }),
      }),
    },
  },
  handler: async (request, reply) => {
    const { id } = request.params
    const user = await findUser(id) // Your logic here
    
    return reply.status(200).send(
      formatSuccess(200, user)
    )
    // Returns: { status: 200, success: true, data: { id, name, email } }
  },
})
```

#### Error Response Format

```typescript
import { formatError } from '@a_jackie_z/fastify-types'

app.route({
  method: 'DELETE',
  url: '/users/:id',
  handler: async (request, reply) => {
    const { id } = request.params
    
    const user = await findUser(id)
    if (!user) {
      return reply.status(404).send(
        formatError(404, 'Not Found', `User with ID ${id} not found`)
      )
      // Returns: { status: 404, success: false, error: 'Not Found', message: '...' }
    }
    
    await deleteUser(id)
    return reply.send(formatSuccess(200, { message: 'User deleted' }))
  },
})
```

#### Automatic Validation Error Formatting

Validation errors are automatically formatted with field-level details:

```typescript
app.route({
  method: 'POST',
  url: '/users',
  config: { jwtTypes: false },
  schema: {
    body: z.object({
      username: z.string().min(3, 'Username must be at least 3 characters'),
      email: z.string().email('Invalid email format'),
      age: z.number().int().min(18, 'Must be at least 18 years old'),
    }),
  },
  handler: async (request, reply) => {
    // If validation fails, automatic error response:
    // {
    //   status: 400,
    //   success: false,
    //   error: 'Validation Error',
    //   message: 'Request validation failed',
    //   details: [
    //     { field: 'username', message: 'Username must be at least 3 characters' },
    //     { field: 'email', message: 'Invalid email format' },
    //     { field: 'age', message: 'Must be at least 18 years old' }
    //   ]
    // }
    
    return reply.send(formatSuccess(200, request.body))
  },
})
```

#### Automatic Error Handling

All errors follow the standardized format automatically:

- **Validation Errors (400)**: Field-level details with field name and message
- **Authentication Errors (401)**: JWT token missing or invalid
- **Authorization Errors (403)**: Insufficient permissions
- **Not Found Errors (404)**: Resource not found
- **Rate Limit Errors (429)**: Too many requests
- **Server Errors (500)**: Internal server errors

All errors are automatically logged via `fastify.log.error` with request context.

```typescript
// Authentication error (automatic)
// GET /protected without JWT token
// { status: 401, success: false, error: 'Unauthorized', message: 'Invalid or missing JWT token' }

// Authorization error (automatic)
// GET /admin without admin role
// { status: 403, success: false, error: 'Forbidden', message: 'Authorization failed' }

// Rate limit error (automatic)
// Too many requests
// { status: 429, success: false, error: 'Too Many Requests', message: 'Rate limit exceeded' }
```

## Configuration Options

### `CreateFastifyOptions`

```typescript
interface CreateFastifyOptions {
  logger?: FastifyServerOptions['loggerInstance']
  rateLimit?: {
    global?: RateLimitPluginOptions
  }
  jwt?: {
    secrets: Record<string, string>        // Multiple secrets for key rotation
    defaultKeyId: string                   // Default secret key ID for signing
    tokenTypes: Record<string, TokenTypeConfig>  // Token type configurations
    requiredTypes?: string[]               // Token types always checked (unless jwtTypes: false)
    debug?: boolean                        // Enable detailed error messages
  }
  swagger?: {
    title: string
    version: string
    description: string
    routePrefix?: string                   // Default: '/docs/'
  }
}

interface TokenTypeConfig {
  headerName: string          // Header to extract token from
  expiresIn: string          // Token expiration (e.g., '15m', '7d', '1h')
  payloadSchema?: z.ZodSchema // Optional Zod schema for payload validation
  algorithm?: Algorithm       // JWT signing algorithm (default: 'HS256')
  iss?: string               // Token issuer
  aud?: string               // Token audience
  allowedIss?: string[]      // Allowed issuers for verification (bypass if undefined)
  header?: {                 // Optional JWT header configuration
    typ?: string             // Token type (typically 'JWT')
    cty?: string             // Content type
    [key: string]: any       // Custom header claims
  }
}
```

### Route JWT Configuration

Routes configure JWT requirements using `jwtTypes`:

```typescript
// Public route - no JWT required
config: { jwtTypes: false }

// Protected route - requires specific token types
config: { jwtTypes: ['access'] }

// Multiple token types required
config: { jwtTypes: ['access', 'service'] }

// No config - uses global requiredTypes (if configured)
// No config specified
```

## API Reference

### Server Functions (`@a_jackie_z/fastify`)

#### `createFastify(options?: CreateFastifyOptions): Promise<FastifyServer>`

Creates and configures a Fastify server instance with Zod support and optional plugins.

#### `runFastify(fastify: FastifyServer, host: string, port: number): Promise<void>`

Starts the Fastify server. Handles errors and exits the process if the server fails to start.

**Parameters:**

- `fastify` - The Fastify server instance
- `host` - The host to bind to (e.g., '0.0.0.0' or 'localhost')
- `port` - The port number to listen on

**Example:**
```typescript
const app = await createFastify()
await runFastify(app, '0.0.0.0', 3000)
```

#### Server-Side Crypto Utilities

```typescript
import { generateId, generateSessionToken, generateSecureString } from '@a_jackie_z/fastify'

// Generate 16-character alphanumeric ID
const id = generateId() // "A1b2C3d4E5f6G7h8"

// Generate 64-character hex session token  
const token = generateSessionToken() // "abc123...def789"

// Generate custom secure string
const customId = generateSecureString(8, '0123456789') // "42875391"
```

### Response Formatting Functions (`@a_jackie_z/fastify-types`)

#### `formatSuccess<T>(status: number, data: T): SuccessResponse<T>`

Creates a standardized success response.

**Parameters:**
- `status` - HTTP status code (e.g., 200, 201)
- `data` - Response data of any type

**Returns:** `SuccessResponse<T>`
```typescript
{
  status: number
  success: true
  data: T
}
```

**Example:**
```typescript
return reply.send(formatSuccess(200, { id: '123', name: 'John' }))
// Returns: { status: 200, success: true, data: { id: '123', name: 'John' } }
```

#### `formatError(status: number, error: string, message: string, details?: ValidationDetail[]): ErrorResponse`

Creates a standardized error response.

**Parameters:**
- `status` - HTTP status code (e.g., 400, 404, 500)
- `error` - Error type/name (e.g., 'Not Found', 'Validation Error')
- `message` - Human-readable error message
- `details` - Optional array of validation error details

**Returns:** `ErrorResponse`
```typescript
{
  status: number
  success: false
  error: string
  message: string
  details?: ValidationDetail[]
}
```

**Example:**
```typescript
return reply.status(404).send(
  formatError(404, 'Not Found', 'User not found')
)
// Returns: { status: 404, success: false, error: 'Not Found', message: 'User not found' }
```

### Response Type Interfaces (`@a_jackie_z/fastify-types`)

#### `SuccessResponse<T>`
```typescript
interface SuccessResponse<T> {
  status: number
  success: true
  data: T
}
```

#### `ErrorResponse`
```typescript
interface ErrorResponse {
  status: number
  success: false
  error: string
  message: string
  details?: ValidationDetail[]
}
```

#### `ValidationDetail`
```typescript
interface ValidationDetail {
  field: string
  message: string
}
```

### Zod Schema Helpers (`@a_jackie_z/fastify-types`)

For defining response schemas with Zod validation:

#### `successResponseSchema<T>(dataSchema: T): ZodObject`

Creates a Zod schema for standardized success responses.

**Parameters:**
- `dataSchema` - Zod schema for the data payload

**Returns:** Zod object schema matching `SuccessResponse<T>`

**Example:**
```typescript
import { z } from 'zod'
import { successResponseSchema } from '@a_jackie_z/fastify-types'

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
})

const loginResponseSchema = {
  body: z.object({
    username: z.string(),
    password: z.string(),
  }),
  response: {
    200: successResponseSchema(z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
    })),
  },
}
```

#### `errorResponseSchema: ZodObject`

Zod schema for standardized error responses. Matches `ErrorResponse` interface.

**Example:**
```typescript
import { errorResponseSchema } from '@a_jackie_z/fastify-types'

const myRouteSchema = {
  response: {
    200: successResponseSchema(z.object({ success: z.boolean() })),
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
  },
}
```

## JWT Service API

### FastifyJwtService

The `FastifyJwtService` is automatically decorated on your Fastify instance when JWT is configured. Access it via `app.jwtService`.

#### Methods

**`generateToken(typeName: string, payload: Record<string, any>): string`**

Generate a JWT token for a specific token type.

```typescript
const accessToken = app.jwtService.generateToken('access', {
  identityId: 'user-123',
  role: 'admin',
})

const serviceToken = app.jwtService.generateToken('service', {
  serviceId: 'gateway',
})
```

**`verifyToken(typeName: string, token: string): any`**

Verify and decode a JWT token for a specific token type. Returns the payload if valid, throws error if invalid.

```typescript
try {
  const payload = app.jwtService.verifyToken('access', token)
  console.log(payload.identityId)
} catch (err) {
  console.error('Invalid token:', err.message)
}
```

**`extractTokenFromHeader(headerValue: string | string[] | undefined, typeName: string): string | null`**

Extract a token from a header value for a specific token type.

```typescript
const token = app.jwtService.extractTokenFromHeader(
  request.headers.authorization,
  'access'
)
```

**`getTokenTypeConfig(typeName: string): TokenTypeConfig | undefined`**

Get the configuration for a specific token type.

```typescript
const config = app.jwtService.getTokenTypeConfig('access')
console.log(config.expiresIn) // '15m'
```

**`getTokenTypeNames(): string[]`**

Get all configured token type names.

```typescript
const types = app.jwtService.getTokenTypeNames()
console.log(types) // ['access', 'refresh', 'service']
```

## Testing Your API

1. Start your server
2. Access Swagger documentation at `http://localhost:3000/docs`
3. Test authentication:

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secret"}'

# Use access token
curl http://localhost:3000/user/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Service-to-service (with both tokens)
curl http://localhost:3000/api/data \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "X-Service-Authorization: YOUR_SERVICE_TOKEN"
```

## License

MIT
