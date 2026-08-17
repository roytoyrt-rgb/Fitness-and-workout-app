import Constants from 'expo-constants';

// API routes (app/api/**/+api.ts) are served by the same Expo dev server that
// serves the JS bundle. In native dev (Expo Go / dev client) `fetch('/api/..')`
// has no origin to resolve against, so we build an absolute URL from the dev
// server host. In a hosted/production build this env var can be set instead.
function apiOrigin(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.hostUri;
  if (hostUri) return `http://${hostUri.split('/')[0]}`;

  return '';
}

export function apiUrl(path: string): string {
  return `${apiOrigin()}${path}`;
}
