import crypto from 'crypto'

const MIN_PASSWORD_LENGTH = 8

export function validatePassword(password: unknown): string {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`)
  }
  return password
}

export function hashPassword(password: unknown): string {
  const validPassword = validatePassword(password)
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(validPassword, salt, 64).toString('hex')
  return `${salt}:${hash}`
}
