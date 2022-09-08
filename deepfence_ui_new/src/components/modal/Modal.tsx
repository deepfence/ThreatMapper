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
  triggerElement?: React.ReactNode;
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
      <div className="h-[85px] p-6">{children}</div>
    </>
  );
};

export const Modal: FC<ModalProps> = ({
  triggerElement,
  title,
  children,
  footer,
  ...rest
}) => {
  return (
    <DialogPrimitive.Root {...rest}>
      <DialogPrimitive.Trigger asChild={triggerElement !== undefined}>
        {triggerElement}
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-20 fixed inset-0 bg-black/50 dark:bg-black/80 animate-overlay-in flex justify-center items-center">
          <DialogPrimitive.Content
            className={cx(
              'animate-modal-in z-50 max-h-[90vh] relative inset-0 overflow-y-auto overflow-x-hidden focus:outline-none',
              'border rounded-lg border-gray-200 bg-white text-gray-900',
              'dark:bg-gray-700 dark:border-gray-600 dark:text-white',
              'min-w-[300px] max-w-[90%]',
            )}
          >
            <ModalHeader title={title} />
            <div className="p-6 overflow-auto max-h-[65vh]">{children}</div>
            <ModalFooter>{footer}</ModalFooter>
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

Modal.displayName = 'Modal';

export default Modal;
