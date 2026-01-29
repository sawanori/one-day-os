// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude test files and jest setup files from Metro bundler
config.resolver.blockList = [
  /.*\.test\.(tsx?|jsx?)$/,
  /jest\.setup\.js$/,
  /jest\.setup\.after\.js$/,
];

module.exports = config;
