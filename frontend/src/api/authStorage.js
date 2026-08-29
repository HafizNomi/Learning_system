/**
 * Single place that owns the JWT pair in localStorage, so the axios
 * interceptor and the redux slice can never disagree about where tokens live.
 */

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

export const getAccessToken = () => localStorage.getItem(ACCESS_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);

export const setTokens = ({ access, refresh }) => {
  if (access) localStorage.setItem(ACCESS_KEY, access);
  // The backend rotates refresh tokens, so a rotated one must replace the old.
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
};

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

/** Decode the JWT payload without verifying it - for reading claims like `role`. */
export const decodeToken = (token) => {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
};

/** True when the access token is missing or past its `exp` claim. */
export const isTokenExpired = (token) => {
  const claims = decodeToken(token);
  if (!claims?.exp) return true;
  return claims.exp * 1000 <= Date.now();
};

/**
 * Turn a DRF error body into one readable line.
 * Handles {detail}, {field: [msgs]}, {non_field_errors: [...]} and plain strings.
 */
export const extractErrorMessage = (data, fallback = 'Something went wrong') => {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;

  const firstKey = Object.keys(data)[0];
  if (!firstKey) return fallback;

  const value = data[firstKey];
  const message = Array.isArray(value) ? value[0] : value;
  if (typeof message !== 'string') return fallback;

  return firstKey === 'non_field_errors' || firstKey === 'detail'
    ? message
    : `${firstKey.replaceAll('_', ' ')}: ${message}`;
};
