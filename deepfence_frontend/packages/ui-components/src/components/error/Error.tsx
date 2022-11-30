import React from 'react';
import { IconContext } from 'react-icons';
import { HiOutlineEmojiSad, HiOutlineExclamation } from 'react-icons/hi';

import { Typography } from '../typography/Typography';

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

export const Error = ({ errorType }: { errorType: DFHTTPErrorType }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div>
        {errorType === 'server' ? (
          <Icon content={<HiOutlineExclamation className="text-red-500" />}></Icon>
        ) : null}
        {errorType === 'notFound' ? (
          <Icon content={<HiOutlineEmojiSad className="text-gray-500" />}></Icon>
        ) : null}
      </div>

      <div className={Typography.size['2xl']}>
        {errorType === 'server' ? 'Oh no!' : null}
        {errorType === 'notFound' ? 'Not Found!' : null}
      </div>

      <div className={`${Typography.size.base} mt-[1rem]`}>
        {errorType === 'server'
          ? 'This page is currently having issues. Please refresh the page or try again later.'
          : null}
        {errorType === 'notFound'
          ? 'The page you are looking for cannot be found.'
          : null}
      </div>
    </div>
  );
};
