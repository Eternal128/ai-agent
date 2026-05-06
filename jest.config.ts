import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        strict: true,
        esModuleInterop: true,
        module: 'commonjs',
        target: 'ES2022',
        resolveJsonModule: true,
        skipLibCheck: true,
        types: ['jest', 'node']
      }
    }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(html-encoding-sniffer|whatwg-encoding|iconv-lite)/)'
  ],
  collectCoverageFrom: ['src/**/*.ts'],
  passWithNoTests: true
};

export default config;
