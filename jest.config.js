module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^k6$': '<rootDir>/test/__mocks__/k6.ts',
    '^k6/http$': '<rootDir>/test/__mocks__/k6.ts',
    '^k6/ws$': '<rootDir>/test/__mocks__/k6.ts',
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
