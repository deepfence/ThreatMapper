import React from 'react';
import { IconContext } from 'react-icons';
import { HiOutlineEmojiSad, HiOutlineExclamation } from 'react-icons/hi';
import { Typography } from 'ui-components';

export type DFHTTPErrorType = 'server' | 'notFound' | 'forbidden';

const Icon = ({ content }: { content: React.ReactNode }) => {
  return (
    <IconContext.Provider
      value={{
        size: '6rem',
      }}
    >
      {content}
    </IconContext.Provider>
  );
};

const getShortText = (type: string) => {
  switch (type) {
    case 'server':
      return 'Oh no!';
    case 'notFound':
      return 'Not Found!';
    default:
      return null;
  }
};

const getLongText = (type: string) => {
  switch (type) {
    case 'server':
      return 'This page is currently having issues. Please refresh the page or try again later.';
    case 'notFound':
      return 'The page you are looking for cannot be found.';
    default:
      return null;
  }
};

export const Error = ({ errorType }: { errorType: DFHTTPErrorType }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div>
        {errorType === 'server' && (
          <Icon content={<HiOutlineExclamation className="text-red-500" />}></Icon>
        )}

        {errorType === 'notFound' && (
          <Icon content={<HiOutlineEmojiSad className="text-gray-500" />}></Icon>
        )}
      </div>

      <div className={`${Typography.size['2xl']} text-gray-500`}>
        {getShortText(errorType)}
      </div>

      <div className={`${Typography.size.base} mt-[1rem] text-gray-500`}>
        {getLongText(errorType)}
      </div>
    </div>
  );
};
