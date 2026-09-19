module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/apps', '<rootDir>/packages'],
  moduleNameMapper: {
    '^@shared-types/(.*)$': '<rootDir>/packages/shared-types/src/$1',
    '^@ai-hr/config/(.*)$': '<rootDir>/packages/config/$1'
  },
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'apps/api/src/**/*.ts',
    '!apps/api/src/index.ts',
    'packages/shared-types/src/**/*.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  }
};