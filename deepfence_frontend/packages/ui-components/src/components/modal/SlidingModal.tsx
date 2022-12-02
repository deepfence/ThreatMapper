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
  direction?: 'left' | 'right';
  width?: string;
  title?: string;
  footer?: React.ReactNode;
  elementToFocusOnCloseRef?: React.RefObject<FocusableElement>;
}

const ModalHeader: FC<{ title?: string }> = ({ title }) => {
  return (
    <>
      <div className={'w-full'}>
        {title && (
          <>
            <DialogPrimitive.Title
              className={cx('p-6')}
              data-testid="sliding-modal-title"
            >
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
            'top-[8px]': !title,
          },
        )}
        id={'sliding-modal-close-button'}
        data-testid={'sliding-modal-close-button'}
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
      <div className="p-6" data-testid="sliding-modal-footer">
        {children}
      </div>
    </>
  );
};

export const SlidingModal: FC<ModalProps> = ({
  title,
  children,
  footer,
  elementToFocusOnCloseRef,
  open,
  width = 'w-9/12', // 33.333333%
  direction = 'right',
  ...rest
}) => {
  const state = useUpdateStateIfMounted(open);
  const wasOpen = state[0];
  const setWasOpen = state[1];

  useEffect(() => {
    setWasOpen(open);
  }, [open]);

  let inAnimation = 'animate-slide-right-in';
  let outAnimation = `animate-slide-right-out`;

  if (direction === 'left') {
    inAnimation = 'animate-slide-left-in';
    outAnimation = 'animate-slide-left-out';
  }

  return (
    <DialogPrimitive.Root open={wasOpen} {...rest}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cx('inset-0 bg-black/50 dark:bg-black/50 fixed', {
            'animate-opacity-in': wasOpen,
            'animate-slide-opacity-out': !wasOpen,
          })}
        >
          <DialogPrimitive.Content
            className={cx(
              'flex flex-col h-[100vh] fixed',
              'overflow-hidden focus:outline-none',
              'bg-white text-gray-900',
              'dark:bg-gray-700 dark:text-white ',
              `${width}`,
              {
                '-left-[100%]': direction === 'left',
                '-right-[100%]': direction === 'right',
                [inAnimation]: wasOpen,
                [outAnimation]: !wasOpen,
              },
            )}
            onCloseAutoFocus={() => elementToFocusOnCloseRef?.current?.focus()}
          >
            <ModalHeader title={title} />
            <div className="p-6 overflow-y-auto flex-auto">{children}</div>
            <ModalFooter>{footer}</ModalFooter>
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

SlidingModal.displayName = 'SlidingModal';

export default SlidingModal;
