import { HiArrowSmLeft } from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import { Outlet } from 'react-router-dom';

import { DFLink } from '@/components/DFLink';
import { usePageNavigation } from '@/utils/usePageNavigation';

const PostureConnectorLayout = () => {
  const { goBack } = usePageNavigation();
  return (
    <>
      <div className="flex p-2  w-full items-center shadow bg-white dark:bg-gray-800">
        <DFLink
          to="#"
          className="flex hover:no-underline items-center justify-center mr-2"
          onClick={() => {
            goBack();
          }}
        >
          <IconContext.Provider
            value={{
              className: 'w-5 h-5 text-blue-600 dark:text-blue-500 ',
            }}
          >
            <HiArrowSmLeft />
          </IconContext.Provider>
        </DFLink>
        <span className="text-md font-medium text-gray-700 dark:text-gray-200 uppercase">
          Posture Connector
        </span>
      </div>
      <div className="p-4">
        <Outlet />
      </div>
    </>
  );
};
export const module = {
  element: <PostureConnectorLayout />,
};
