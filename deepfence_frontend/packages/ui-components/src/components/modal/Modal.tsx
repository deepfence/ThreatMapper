import * as DialogPrimitive from '@radix-ui/react-dialog';
import cx from 'classnames';
import React, { FC, useEffect } from 'react';
import { IconContext } from 'react-icons';
import { HiX } from 'react-icons/hi';

import { useUpdateStateIfMounted } from '@/components/hooks/useUpdateStateIfMounted';
import Separator from '@/components/separator/Separator';

interface FocusableElement {
  focus(options?: FocusOptions): void;
}

type ChildrenType = {
  children: React.ReactNode;
};
export interface ModalProps extends DialogPrimitive.DialogProps {
  width?: string;
  title?: string;
  footer?: React.ReactNode;
  elementToFocusOnCloseRef?: React.RefObject<FocusableElement>;
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
            <DialogPrimitive.Title className={cx('p-6')} data-testid="modal-title">
              {title}
            </DialogPrimitive.Title>
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
          'focus:outline-none focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-800',
          {
            'top-[22px]': title,
            'top-[10px]': !title,
          },
        )}
        id={'modal-close-button'}
        data-testid={'modal-close-button'}
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
      <div className="p-6" data-testid="modal-footer">
        {children}
      </div>
    </>
  );
};

// TODO: To make modal body scrollable with fixed header and footer

export const Modal: FC<ModalProps> = ({
  title,
  children,
  footer,
  elementToFocusOnCloseRef,
  width = '',
  open,
  ...rest
}) => {
  const state = useUpdateStateIfMounted(open);
  const wasOpen = state[0];
  const setWasOpen = state[1];

  useEffect(() => {
    setWasOpen(open);
  }, [open]);

  return (
    <DialogPrimitive.Root open={wasOpen} {...rest}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cx(
            'fixed inset-0 bg-black/50 dark:bg-black/50 flex justify-center items-center',
            {
              'animate-opacity-in': wasOpen,
              // 'animate-opacity-out': !wasOpen, TODO: Add animation on close of modal
            },
          )}
        >
          <DialogPrimitive.Content
            className={cx(
              'max-h-[90vh] relative flex flex-col overflow-x-hidden focus:outline-none',
              'border rounded-lg border-gray-200 bg-white text-gray-900',
              'dark:bg-gray-700 dark:border-gray-600 dark:text-white',
              'max-w-[90%]',
              `${width}`,
              {
                'animate-pop-in': wasOpen,
                'animate-pop-out': !wasOpen,
              },
            )}
            onCloseAutoFocus={() => elementToFocusOnCloseRef?.current?.focus()}
          >
            <ModalHeader title={title} />
            <div className="overflow-y-auto h-full">{children}</div>
            <ModalFooter>{footer}</ModalFooter>
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

Modal.displayName = 'Modal';

export default Modal;
