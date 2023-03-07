const storagePrefix = 'deepfence_';

export type AuthUserType = {
  accessToken: string;
  refreshToken: string;
};

const storage = {
  getAuth: (): AuthUserType | null => {
    const storageObj = JSON.parse(
      window.localStorage.getItem(`${storagePrefix}auth`) ?? '{}',
    );
    if (
      'accessToken' in storageObj &&
      typeof storageObj.accessToken === 'string' &&
      'refreshToken' in storageObj &&
      typeof storageObj.refreshToken === 'string'
    ) {
      return storageObj as AuthUserType;
    }
    return null;
  },
  setAuth: (tokens: AuthUserType) => {
    window.localStorage.setItem(`${storagePrefix}auth`, JSON.stringify(tokens));
  },
  clearAuth: () => {
    window.localStorage.removeItem(`${storagePrefix}auth`);
  },
};

export default storage;
