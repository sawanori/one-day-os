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

// i18next mock - tests return keys directly
jest.mock('i18next', () => {
  const actual = {
    t: (key, options) => {
      if (options?.defaultValue) return options.defaultValue;
      return key;
    },
    use: () => actual,
    init: () => Promise.resolve(),
    language: 'ja',
    changeLanguage: jest.fn(),
    isInitialized: true,
  };
  return { __esModule: true, default: actual, ...actual };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (options?.defaultValue) return options.defaultValue;
      return key;
    },
    i18n: {
      language: 'ja',
      changeLanguage: jest.fn(),
    },
  }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
  Trans: ({ children }) => children,
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'ja', languageTag: 'ja-JP' }],
}));

// Import @testing-library/react-native to ensure it's available
require('@testing-library/react-native');
