module.exports = {
  preset: 'jest-expo',
  resetMocks: false,
  clearMocks: false,
  restoreMocks: false,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!(expo-sqlite|expo-modules-core|expo-asset|expo.*|react-native|@react-native|react-native-.*)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.after.js'],
  testMatch: [
    '**/__tests__/**/*.test.ts?(x)',
    '**/src/**/*.test.ts?(x)',
    '**/app/**/*.test.ts?(x)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
