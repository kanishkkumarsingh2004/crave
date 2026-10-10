/**
 * Jest setupFiles — runs in the VM context BEFORE any test module is loaded.
 * This ensures environment variables are in place when the jose mock evaluates
 * process.env.JWT_SECRET at module-load time.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-jest'
process.env.WS_INTERNAL_SECRET = process.env.WS_INTERNAL_SECRET || 'test-ws-internal-secret'
process.env.NODE_ENV = 'test'
