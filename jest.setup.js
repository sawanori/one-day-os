// jest.setup.js
// Setup file for Jest tests - runs BEFORE jest-expo

// Define __DEV__ global for Expo/React Native
global.__DEV__ = true;

// Mock expo-sqlite before it's imported
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
  openDatabaseSync: jest.fn(),
  deleteDatabaseAsync: jest.fn(),
  deleteDatabaseSync: jest.fn(),
}));
