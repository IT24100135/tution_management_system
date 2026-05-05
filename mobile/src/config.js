import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEFAULT_PORT = '5000';

const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');
const readExpoExtra = () => (
  Constants.expoConfig?.extra
  || Constants.manifest2?.extra
  || Constants.manifest?.extra
  || {}
);

const extractHost = (value = '') => {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return '';

  const withoutScheme = normalizedValue.replace(/^[a-z]+:\/\//i, '');
  const withoutPath = withoutScheme.split('/')[0];
  const withoutQuery = withoutPath.split('?')[0];
  const host = withoutQuery.split(':')[0].trim();

  return host;
};

const getHostFromExpo = () => {
  const hostCandidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    Constants.linkingUri,
    Constants.experienceUrl,
    Constants.platform?.hostUri,
    Constants.manifest2?.extra?.expoGo?.debuggerHost,
    Constants.manifest?.debuggerHost,
  ];

  return hostCandidates
    .map(extractHost)
    .find((host) => host && host !== 'localhost' && host !== '127.0.0.1')
    || '';
};

const getHostFromWindow = () => {
  if (Platform.OS !== 'web' || !globalThis.location) {
    return '';
  }

  const browserHost = extractHost(globalThis.location.origin || globalThis.location.href || '');
  return browserHost || '';
};

const buildBaseUrlFromHost = (host) => `http://${host}:${DEFAULT_PORT}`;

const resolveApiBaseUrl = () => {
  // Quick override for any environment:
  // EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:5000
  const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envBaseUrl) return trimTrailingSlash(envBaseUrl);

  // On web, prefer the browser host so localhost web points to localhost backend,
  // and LAN-hosted web points back to the same machine's backend.
  const browserHost = getHostFromWindow();
  if (browserHost) {
    return buildBaseUrlFromHost(browserHost);
  }

  // Stable explicit override from Expo config.
  const expoExtra = readExpoExtra();
  if (expoExtra.apiBaseUrl) {
    return trimTrailingSlash(expoExtra.apiBaseUrl);
  }

  // Expo Go on physical devices usually exposes your dev machine host.
  const expoHost = getHostFromExpo();
  if (expoHost && expoHost !== 'localhost' && expoHost !== '127.0.0.1') {
    return buildBaseUrlFromHost(expoHost);
  }

  // Emulator/simulator fallback defaults.
  const fallbackHost = Platform.select({
    android: '10.0.2.2',
    ios: 'localhost',
    default: 'localhost',
  });
  return buildBaseUrlFromHost(fallbackHost);
};

export const API_BASE_URL = resolveApiBaseUrl();
