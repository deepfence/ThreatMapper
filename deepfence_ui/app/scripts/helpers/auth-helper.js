// eslint-disable-next-line import/no-cycle
import { refreshAuthToken } from '../utils/web-api-utils';

export function getAuthHeader() {
  const authToken = localStorage.getItem('authToken');
  let auth;
  if (authToken) {
    auth = `Bearer ${authToken}`;
  } else {
    auth = '';
  }
  return auth;
}

export function getRefreshToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  let refreshTokenStr;
  if (refreshToken) {
    refreshTokenStr = `Bearer ${refreshToken}`;
  } else {
    refreshTokenStr = '';
  }
  return refreshTokenStr;
}

export function decodeJwtToken(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace('-', '+').replace('_', '/');
  return JSON.parse(window.atob(base64));
}

export function isUserSessionActive() {
  let isSessionActive = false;
  const authToken = localStorage.getItem('authToken');
  if (authToken) {
    setInterval(() => {
      refreshAuthTokenIfRequired();
    }, 60 * 5 * 1000);
    isSessionActive = true;

  }

  const licenseStatus = localStorage.getItem('licenseStatus');
  if (isSessionActive && licenseStatus === 'false') {
    window.parent.location.hash = '/settings';
  }

  return isSessionActive;
}

export async function isUserSessionActiveAsync() {
  let isSessionActive = false;
  const authToken = localStorage.getItem('authToken');
  if (authToken) {
    setInterval(() => {
      refreshAuthTokenIfRequired();
    }, 60 * 5 * 1000);
    await refreshAuthTokenIfRequired();
    isSessionActive = true;
  }

  const licenseStatus = localStorage.getItem('licenseStatus');
  if (isSessionActive && licenseStatus === 'false') {
    window.parent.location.hash = '/settings';
  }

  return isSessionActive;
}


async function refreshAuthTokenIfRequired() {
  if (localStorage.getItem('authToken')) {
    const jwt = decodeJwtToken(localStorage.getItem('authToken'));
    const currentTime = new Date();
    const authTokenExpiryTime = new Date(jwt.exp * 1000);
    const timeDiff = authTokenExpiryTime.getTime() - currentTime.getTime();
    const minuteDiff = Math.round(timeDiff / 60000);
    if (minuteDiff < 30) {
      await refreshAuthToken();
    }
  }
}

export function getUserRole() {
  if (localStorage.getItem('authToken')) {
    const jwt = decodeJwtToken(localStorage.getItem('authToken'));
    return jwt.sub.role;
  }
  return null;
}

export function isPasswordInvalidated() {
  return localStorage.getItem('passwordInvalidated') === 'true';
}
