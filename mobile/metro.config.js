const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /edge-profile[\\/].*/,
  /edge-profile-2[\\/].*/,
  /expo-web-dom(?:-localhost)?\.html$/,
  /expo-web\.(?:err|out)\.log$/,
];

module.exports = config;
