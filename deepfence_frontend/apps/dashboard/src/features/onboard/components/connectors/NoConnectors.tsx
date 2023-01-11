import { IconContext } from 'react-icons';
import { HiOutlineExclamationCircle } from 'react-icons/hi';
import { Typography } from 'ui-components';

export const NoConnectors = () => {
  return (
    <div className="flex flex-col items-center h-full w-full justify-center">
      <IconContext.Provider
        value={{
          className: 'dark:text-blue-500 text-gray-900 w-[70px] h-[70px]',
        }}
      >
        <HiOutlineExclamationCircle />
      </IconContext.Provider>
      <p
        className={`text-gray-900 dark:text-gray-400 ${Typography.size.base} ${Typography.weight.normal}`}
      >
        No Connectors are registered
      </p>
    </div>
  );
};
