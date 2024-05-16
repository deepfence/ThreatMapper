import { forwardRef } from 'react';
import { cn } from 'tailwind-preset';

import { UserLineIcon } from '@/components/icons/UserLine';

export interface AvatarType {
  alt?: string;
  src?: string;
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

export const Avatar = forwardRef<HTMLButtonElement, AvatarType>(
  ({ children = <UserLineIcon />, src = '', alt = '', className = '', onClick }, ref) => {
    return (
      <button
        ref={ref}
        onClick={onClick}
        className={cn(
          `inline-flex overflow-hidden relative justify-center items-center w-10 h-10 bg-gray-100 rounded-full dark:bg-gray-600`,
          `text-gray-700 dark:text-gray-100 text-lg`,
          'outline-none focus-visible:ring-gray-500 focus-visible:ring-2 dark:focus-visible:ring-gray-400',
          className,
        )}
      >
        {!src || src.trim().length === 0 ? (
          <span className="w-6 h-6">{children}</span>
        ) : (
          <img src={src} alt={alt} className="p-2" />
        )}
      </button>
    );
  },
);
