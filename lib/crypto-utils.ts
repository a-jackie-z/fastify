import { randomBytes } from 'node:crypto'

/**
 * Server-side crypto utilities for generating secure IDs and tokens
 * These functions require Node.js crypto module and are not frontend-compatible
 */

const ID_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const ID_LENGTH = 16

/**
 * Generate a random 16-character alphanumeric ID
 */
export function generateId(): string {
  const bytes = randomBytes(ID_LENGTH)
  let result = ''
  for (let i = 0; i < ID_LENGTH; i++) {
    result += ID_ALPHABET[bytes[i]! % ID_ALPHABET.length]
  }
  return result
}

/**
 * Generate a secure session token (64-character hex string)
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Generate a secure random string with specified length
 * @param length - Length of the string to generate
 * @param alphabet - Alphabet to use (defaults to alphanumeric)
 */
export function generateSecureString(length: number, alphabet = ID_ALPHABET): string {
  const bytes = randomBytes(length)
  let result = ''
  for (let i = 0; i < length; i++) {
    result += alphabet[bytes[i]! % alphabet.length]
  }
  return result
}
