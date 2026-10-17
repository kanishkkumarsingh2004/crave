import crypto from 'crypto'

const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 256

export function validatePassword(password: unknown): string {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`)
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(`Password must be no more than ${MAX_PASSWORD_LENGTH} characters long`)
  }
  return password
}

export function hashPassword(password: unknown): string {
  const validPassword = validatePassword(password)
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(validPassword, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(
  password: unknown,
  storedHash: unknown,
  legacySalt?: string
): boolean {
  if (
    typeof password !== 'string' ||
    password.length > MAX_PASSWORD_LENGTH ||
    typeof storedHash !== 'string' ||
    !storedHash
  ) {
    return false
  }

  let salt = legacySalt
  let expectedHash = storedHash
  if (storedHash.includes(':')) {
    const parts = storedHash.split(':')
    if (parts.length !== 2 || !parts[0] || !parts[1]) return false
    ;[salt, expectedHash] = parts
  }
  if (!salt) return false

  try {
    const computed = crypto.scryptSync(password, salt, 64).toString('hex')
    return (
      computed.length === expectedHash.length &&
      crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(expectedHash))
    )
  } catch {
    return false
  }
}
