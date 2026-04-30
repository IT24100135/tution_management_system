import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEFAULT_PORT = '5000';

const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

const getHostFromExpo = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost ||
    '';

  if (!hostUri) return '';
  return hostUri.split(':')[0];
};

const buildBaseUrlFromHost = (host) => `http://${host}:${DEFAULT_PORT}`;

const resolveApiBaseUrl = () => {
  // Quick override for any environment:
  // EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:5000
  const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envBaseUrl) return trimTrailingSlash(envBaseUrl);

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
