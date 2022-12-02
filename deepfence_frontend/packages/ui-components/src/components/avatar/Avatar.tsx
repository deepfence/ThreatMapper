import cx from 'classnames';
import { IconContext } from 'react-icons';
import { HiOutlineUser } from 'react-icons/hi';
import { twMerge } from 'tailwind-merge';

import { Typography } from '@/components/typography/Typography';

type AvatarType = {
  asChild?: boolean;
  alt?: string;
  src?: string;
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
};

const Child = ({ children }: { children: AvatarType['children'] }) => {
  return (
    <>
      {children ? (
        children
      ) : (
        <IconContext.Provider
          value={{
            className: cx(`w-6 h-6`, {}),
          }}
        >
          <HiOutlineUser />
        </IconContext.Provider>
      )}
    </>
  );
};

export const Avatar = (props: AvatarType) => {
  const {
    asChild = false,
    children = undefined,
    src = '',
    alt = '',
    className = '',
    onClick,
  } = props;

  return (
    <button
      onClick={onClick}
      className={twMerge(
        cx(
          `inline-flex overflow-hidden relative justify-center items-center w-10 h-10 bg-gray-100 rounded-full dark:bg-gray-600`,
          `text-gray-700 dark:text-gray-100 ${Typography.size.lg}`,
        ),
        className,
      )}
    >
      {!asChild ? <img src={src} alt={alt} className="p-2" /> : <Child>{children}</Child>}
    </button>
  );
};
