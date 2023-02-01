import { IconContext } from 'react-icons';
import { FaCloud, FaImages, FaTags } from 'react-icons/fa';
import { HiArrowSmRight } from 'react-icons/hi';
import { Button, Card } from 'ui-components';

import LogoAzure from '@/assets/logo-azure.svg';

export const Registries = () => {
  return (
    <div className="flex gap-6 flex-wrap">
      {Array.from(Array(10).keys()).map((i) => {
        return (
          <Card className="p-4 flex flex-col items-center gap-2 shrink-0" key={i}>
            <div className="flex items-center justify-between w-full">
              <h4 className="text-gray-900 text-md dark:text-white">
                Azure Container Registry
              </h4>
              <div className="flex ml-auto mt-2">
                <Button
                  size="xs"
                  color="normal"
                  className="ml-auto text-blue-600 dark:text-blue-500"
                >
                  Go to details
                  <IconContext.Provider
                    value={{
                      className: '',
                    }}
                  >
                    <HiArrowSmRight />
                  </IconContext.Provider>
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="px-4 flex items-center border-r border-gray-200 dark:border-gray-700 w-24 h-24">
                <img height="100%" width="100%" src={LogoAzure} alt="logo" />
              </div>
              <div className="flex gap-x-4 justify-center items-center">
                <div className="flex flex-col justify-center">
                  <div className="pr-4 flex items-center gap-x-2">
                    <IconContext.Provider
                      value={{
                        className: 'h-6 w-6 text-blue-500 dark:text-blue-400',
                      }}
                    >
                      <FaCloud />
                    </IconContext.Provider>
                    <span className="text-[2rem] text-gray-900 dark:text-gray-200 font-light">
                      23
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Total Accounts
                  </span>
                </div>
                <div className="gap-x-2 flex flex-col justify-center">
                  <div className="pr-4 flex items-center gap-x-2">
                    <IconContext.Provider
                      value={{
                        className: 'h-6 w-6 text-teal-500 dark:text-teal-400',
                      }}
                    >
                      <FaImages />
                    </IconContext.Provider>
                    <span className="text-[2rem] text-gray-900 dark:text-gray-200 font-light">
                      23
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Total Images
                  </span>
                </div>
                <div className="gap-x-2 flex flex-col justify-center">
                  <div className="pr-4 flex items-center gap-x-2">
                    <IconContext.Provider
                      value={{
                        className: 'h-6 w-6 text-indigo-600 dark:text-indigo-400',
                      }}
                    >
                      <FaTags />
                    </IconContext.Provider>
                    <span className="text-[2rem] text-gray-900 dark:text-gray-200 font-light">
                      23
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Total Tags
                  </span>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
