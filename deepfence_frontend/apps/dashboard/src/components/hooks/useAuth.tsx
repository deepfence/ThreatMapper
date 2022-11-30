import { useNavigate } from 'react-router-dom';

import { useLocalStorage } from './useLocalStorage';

export type AuthUserType = {
  isLogin: boolean;
};

export const useAuth = () => {
  const navigate = useNavigate();
  const [user, setLoginUser] = useLocalStorage<AuthUserType>('user');
  const login = () => {
    setLoginUser({
      isLogin: true,
    });
    navigate('/home', {
      replace: true,
    });
  };

  const logout = () => {
    setLoginUser({
      isLogin: false,
    });
    navigate('/login', {
      replace: true,
    });
  };

  return {
    login,
    logout,
    user,
  };
};
