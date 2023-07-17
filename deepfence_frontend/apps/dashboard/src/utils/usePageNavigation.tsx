import { useLocation, useNavigate } from 'react-router-dom';

export const usePageNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = () => {
    const historyEntryExists = location.key !== 'default';
    if (!historyEntryExists) {
      navigate('/');
      return;
    }
    navigate(-1);
  };

  return {
    goBack,
    navigate,
  };
};
