module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages'],
  moduleNameMapper: {
    '^@shared-types/(.*)$': '<rootDir>/packages/shared-types/src/$1'
  },
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['packages/backend/src/**/*.ts', '!packages/backend/src/index.ts'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  }
};
