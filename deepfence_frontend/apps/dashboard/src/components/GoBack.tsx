import { IconContext } from 'react-icons';
import { HiArrowSmLeft } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import { Button } from 'ui-components';

export const GoBack = () => {
  const navigate = useNavigate();
  const goBack = () => {
    navigate(-1);
  };
  return (
    <Button size="xs" color="normal" className="text-blue-600 dark:text-blue-500">
      <IconContext.Provider
        value={{
          className: 'w-5 h-5 text-blue-600 dark:text-blue-500 ',
        }}
      >
        <HiArrowSmLeft onClick={goBack} />
      </IconContext.Provider>
    </Button>
  );
};
