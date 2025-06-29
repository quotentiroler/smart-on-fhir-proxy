module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testTimeout: 30000,
  verbose: true,
  roots: ['<rootDir>'],
  testMatch: [
    '**/smart-flows/**/?(*.)+(spec|test).ts',
    '**/oauth-security/**/?(*.)+(spec|test).ts',
    '**/client-registration/**/?(*.)+(spec|test).ts',
    '**/util/**/?(*.)+(spec|test).ts',
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!jest.config.js',
    '!jest.setup.ts'
  ]
};
