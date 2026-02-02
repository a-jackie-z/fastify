import type { FastifyError, FastifyInstance } from 'fastify'
import { formatError, type ValidationDetail } from './response.ts'

export interface CreateErrorOptions {
  statusCode?: number
  message: string
  name?: string
}

export function createError(options: CreateErrorOptions): FastifyError {
  const {
    statusCode = 500,
    message,
    name = 'Error',
  } = options

  const error = new Error(message) as FastifyError
  error.statusCode = statusCode
  error.name = name
  return error
}

export function setupErrorHandler(fastify: FastifyInstance): void {
  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    // Log all errors
    fastify.log.error({
      err: error,
      url: request.url,
      method: request.method,
    }, 'Request error')

    // Handle Zod validation errors
    if (error.validation) {
      const details: ValidationDetail[] = error.validation.map((issue: any) => {
        // Build field path from dataPath or instancePath
        const field = issue.instancePath || issue.dataPath || issue.params?.missingProperty || 'unknown'
        const cleanField = field.startsWith('/') ? field.slice(1).replace(/\//g, '.') : field

        return {
          field: cleanField || 'unknown',
          message: issue.message || 'Validation failed',
        }
      })

      return reply.status(400).send(
        formatError(400, 'Validation Error', 'Request validation failed', details)
      )
    }

    // Handle rate limit errors
    if (error.statusCode === 429) {
      return reply.status(429).send(
        formatError(429, 'Too Many Requests', 'Rate limit exceeded')
      )
    }

    // Handle authentication errors
    if (error.statusCode === 401) {
      return reply.status(401).send(
        formatError(401, 'Unauthorized', error.message || 'Authentication required')
      )
    }

    // Handle authorization errors
    if (error.statusCode === 403) {
      return reply.status(403).send(
        formatError(403, 'Forbidden', error.message || 'Access denied')
      )
    }

    // Handle not found errors
    if (error.statusCode === 404) {
      return reply.status(404).send(
        formatError(404, 'Not Found', error.message || 'Resource not found')
      )
    }

    // Handle all other errors as internal server errors
    const statusCode = error.statusCode || 500
    return reply.status(statusCode).send(
      formatError(
        statusCode,
        statusCode === 500 ? 'Internal Server Error' : error.name || 'Error',
        error.message || 'An unexpected error occurred'
      )
    )
  })
}
