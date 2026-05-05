const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = new RegExp(
  [
    'edge-profile[\\\\/].*',
    'edge-profile-2[\\\\/].*',
    'expo-web-dom(?:-localhost)?\\.html$',
    'expo-web\\.(?:err|out)\\.log$',
  ].join('|')
);

module.exports = config;
