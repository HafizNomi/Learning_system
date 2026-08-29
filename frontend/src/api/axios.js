import axios from 'axios';
import { toast } from 'react-toastify';
import {
  clearTokens,
  extractErrorMessage,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from './authStorage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Endpoints that must never trigger a token refresh: a 401 from them means
// "these credentials are wrong", not "this access token went stale".
const AUTH_ENDPOINTS = [
  '/accounts/login/',
  '/accounts/token/',
  '/accounts/token/refresh/',
  '/accounts/register/',
  '/accounts/password-reset/',
  '/accounts/verify-email/',
];

const isAuthEndpoint = (url = '') => AUTH_ENDPOINTS.some((path) => url.includes(path));

// --- Request: attach the bearer token -------------------------------------

api.interceptors.request.use(
  (config) => {
    // FormData (e.g. profile picture upload) needs the browser to set its own
    // multipart boundary.
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    const token = getAccessToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Response: refresh once, then replay the queued requests --------------

// A single in-flight refresh shared by every request that got a 401. Without
// this, parallel 401s each POST the same refresh token - and because the
// backend rotates and blacklists refresh tokens, all but the first would fail.
let refreshPromise = null;

const refreshAccessToken = () => {
  if (refreshPromise) return refreshPromise;

  const refresh = getRefreshToken();
  if (!refresh) return Promise.reject(new Error('No refresh token stored'));

  refreshPromise = axios
    .post(`${API_URL}/accounts/token/refresh/`, { refresh })
    .then(({ data }) => {
      // The backend rotates refresh tokens - persist both halves of the pair.
      setTokens({ access: data.access, refresh: data.refresh });
      return data.access;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

const onSessionExpired = () => {
  clearTokens();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login?expired=1';
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint(originalRequest.url)) {
      originalRequest._retry = true;
      try {
        const access = await refreshAccessToken();
        originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${access}` };
        return api(originalRequest);
      } catch (refreshError) {
        onSessionExpired();
        return Promise.reject(refreshError);
      }
    }

    // Let the auth slice own the messaging for auth calls, and stay quiet on
    // validation errors, which are rendered next to the offending field.
    const handledByCaller = originalRequest._silent || isAuthEndpoint(originalRequest.url);
    if (!handledByCaller && status !== 400) {
      toast.error(extractErrorMessage(error.response?.data, error.message));
    }

    return Promise.reject(error);
  }
);

export default api;
