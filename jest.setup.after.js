// jest.setup.after.js
// Setup file that runs after the test environment is set up

// Define __DEV__ global for Expo/React Native
global.__DEV__ = true;

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
  openDatabaseSync: jest.fn(),
  deleteDatabaseAsync: jest.fn(),
  deleteDatabaseSync: jest.fn(),
}));

// Import @testing-library/react-native to ensure it's available
require('@testing-library/react-native');
