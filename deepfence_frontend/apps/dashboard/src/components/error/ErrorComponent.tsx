import { IconContext } from 'react-icons';
import { HiOutlineExclamationCircle } from 'react-icons/hi';
import { useRouteError } from 'react-router-dom';

export const ErrorComponent = () => {
  const error = useRouteError();
  console.error(error);
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <IconContext.Provider
        value={{
          className: 'dark:text-gray-600 text-gray-400 w-[70px] h-[70px]',
        }}
      >
        <HiOutlineExclamationCircle />
      </IconContext.Provider>
      <p className={`mt-2 text-gray-900 dark:text-gray-400 text-lg font-normal`}>
        Opps! Something went wrong
      </p>
      <p className={`text-gray-900 dark:text-gray-400 text-sm font-normal`}>
        An unknown error occured, please try in sometime
      </p>
    </div>
  );
};
