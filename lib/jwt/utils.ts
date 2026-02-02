/**
 * Parse JWT secrets from environment variable format
 * @param secretsString - Secrets in format: "key1=secret1|key2=secret2"
 * @returns Record mapping key IDs to their secrets
 * @throws Error if format is invalid, empty, contains duplicates, or has empty values
 */
export function parseJwtSecrets(secretsString: string): Record<string, string> {
  if (!secretsString || secretsString.trim().length === 0) {
    throw new Error('JWT secrets string cannot be empty')
  }

  const secrets: Record<string, string> = {}
  const pairs = secretsString.split('|')

  if (pairs.length === 0) {
    throw new Error('JWT secrets string must contain at least one key=secret pair')
  }

  for (const pair of pairs) {
    const trimmedPair = pair.trim()
    if (!trimmedPair) {
      continue // Skip empty pairs from trailing/leading separators
    }

    const separatorIndex = trimmedPair.indexOf('=')
    if (separatorIndex === -1) {
      throw new Error(`Invalid JWT secret format: "${pair}". Expected format: key=secret`)
    }

    const keyId = trimmedPair.substring(0, separatorIndex).trim()
    const secret = trimmedPair.substring(separatorIndex + 1).trim()

    if (!keyId) {
      throw new Error(`Empty key ID in JWT secret pair: "${pair}"`)
    }

    if (!secret) {
      throw new Error(`Empty secret for key ID "${keyId}"`)
    }

    if (secrets[keyId]) {
      throw new Error(`Duplicate key ID "${keyId}" in JWT secrets`)
    }

    secrets[keyId] = secret
  }

  if (Object.keys(secrets).length === 0) {
    throw new Error('JWT secrets string must contain at least one valid key=secret pair')
  }

  return secrets
}
