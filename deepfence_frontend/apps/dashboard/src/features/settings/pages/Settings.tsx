import { Outlet } from 'react-router-dom';

const Settings = () => {
  return (
    <>
      <div className="flex p-2 pl-2 w-full items-center shadow bg-white dark:bg-gray-800">
        <span className="text-md font-medium text-gray-700 dark:text-gray-200">
          Settings
        </span>
      </div>
      <Outlet />
    </>
  );
};

export const module = {
  element: <Settings />,
};
