import { useNavigate } from 'react-router-dom';

export const usePageNavigation = () => {
  const navigate = useNavigate();
  const goBack = () => {
    navigate(-1);
  };

  return {
    goBack,
    navigate,
  };
};
