module.exports = {
  testEnvironment: 'jsdom',
  // setupFiles runs BEFORE any test module is imported — needed so env vars
  // (JWT_SECRET etc.) are set before the jose mock evaluates them at load time.
  setupFiles: ['<rootDir>/test/jest-env-setup.js'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^k6$': '<rootDir>/test/__mocks__/k6.ts',
    '^k6/http$': '<rootDir>/test/__mocks__/k6.ts',
    '^k6/ws$': '<rootDir>/test/__mocks__/k6.ts',
    // Redirect @prisma/client to a stub so tests that don't mock it at the top
    // level don't fail with "Cannot find module .prisma/client/default".
    // Tests that need fine-grained control mock @/lib/prisma directly instead.
    '^@prisma/client$': '<rootDir>/test/__mocks__/prisma-client.js',
  },
  testMatch: ['<rootDir>/test/**/*.test.{ts,tsx}'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['babel-jest', { configFile: './babel.jest.config.js' }],
  },
  transformIgnorePatterns: ['/node_modules/(?!jose|next)'],
  testTimeout: 15000,
  clearMocks: true,
  restoreMocks: true,
}
