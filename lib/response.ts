import { z } from 'zod'

// Response Types
export interface ValidationDetail {
  field: string
  message: string
}

export interface SuccessResponse<T> {
  status: number
  success: true
  data: T
}

export interface ErrorResponse {
  status: number
  success: false
  error: string
  message: string
  details?: ValidationDetail[]
}

// Response Formatters
export function formatSuccess<T>(status: number, data: T): SuccessResponse<T> {
  return {
    status,
    success: true,
    data,
  }
}

export function formatError(
  status: number,
  error: string,
  message: string,
  details?: ValidationDetail[]
): ErrorResponse {
  const response: ErrorResponse = {
    status,
    success: false,
    error,
    message,
  }
  if (details && details.length > 0) {
    response.details = details
  }
  return response
}

// Zod Schema Helpers for Standardized Responses
export const successResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  status: z.number(),
  success: z.literal(true),
  data: dataSchema,
})

export const errorResponseSchema = z.object({
  status: z.number(),
  success: z.literal(false),
  error: z.string(),
  message: z.string(),
  details: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })).optional(),
})
