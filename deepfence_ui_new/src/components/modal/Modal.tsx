import * as DialogPrimitive from '@radix-ui/react-dialog';
import cx from 'classnames';
import React, { FC } from 'react';
import { IconContext } from 'react-icons';
import { HiX } from 'react-icons/hi';

import Separator from '../separator/Separator';

type ChildrenType = {
  children: React.ReactNode;
};
export interface ModalProps extends DialogPrimitive.DialogProps {
  onOpenChange: (value: boolean) => void;
  width?: string;
  title?: string;
  footer?: React.ReactNode;
}

const ModalHeader: FC<{ title?: string }> = ({ title }) => {
  return (
    <>
      <div
        className={cx({
          'h-[76px]': title,
          'h-[36px]': !title,
        })}
      >
        {title && (
          <>
            <DialogPrimitive.Title className={cx('p-6')}>{title}</DialogPrimitive.Title>
            <Separator className="h-px block bg-gray-200 dark:bg-gray-600" />
          </>
        )}
      </div>
      <DialogPrimitive.Close
        aria-label="Close"
        className={cx(
          'h-36px rounded-lg cursor-pointer',
          'text-gray-400 hover:text-gray-900 dark:hover:text-white',
          'hover:bg-gray-200 dark:hover:bg-gray-600',
          'absolute right-3.5 inline-flex items-center justify-center p-1',
          'focus:outline-none focus:ring-1 foucs:ring-blue-800',
          {
            'top-[22px]': title,
            'top-[10px]': !title,
          },
        )}
      >
        <IconContext.Provider
          value={{
            size: '20px',
          }}
        >
          <HiX />
        </IconContext.Provider>
      </DialogPrimitive.Close>
    </>
  );
};

const ModalFooter: FC<ChildrenType> = ({ children }) => {
  if (children === undefined) {
    return null;
  }
  return (
    <>
      <Separator className="h-px block bg-gray-200 dark:bg-gray-600" />
      <div className="p-6">{children}</div>
    </>
  );
};

// TODO: To make modal body scrollable with fixed header and footer
// TODO: To focus on the trigger element after modal is closed

export const Modal: FC<ModalProps> = ({
  title,
  children,
  footer,
  width = 'w-4/12', // 33.333333%
  onOpenChange,
  ...rest
}) => {
  const _onOpenChange = (value: boolean) => {
    onOpenChange(value);
  };

  return (
    <DialogPrimitive.Root {...rest} onOpenChange={_onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 dark:bg-black/80 animate-overlay-in h-full">
          <DialogPrimitive.Content
            className={cx(
              'max-h-[90vh] relative top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%] inset-0 overflow-y-auto overflow-x-hidden focus:outline-none',
              'border rounded-lg border-gray-200 bg-white text-gray-900',
              'dark:bg-gray-700 dark:border-gray-600 dark:text-white',
              'max-w-[90%]',
              `${width}`,
            )}
          >
            <ModalHeader title={title} />
            <div className="p-6 overflow-y-auto h-full">{children}</div>
            <ModalFooter>{footer}</ModalFooter>
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

Modal.displayName = 'Modal';

export default Modal;
