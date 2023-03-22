import * as DialogPrimitive from '@radix-ui/react-dialog';
import cx from 'classnames';
import React, { FC, useEffect } from 'react';
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
  elementToFocusOnCloseRef?: React.RefObject<FocusableElement> | null;
}

export const SlidingModalCloseButton = () => (
  <DialogPrimitive.Close
    aria-label="Close"
    className={cx(
      'absolute right-0 mr-4 mt-4 rounded-lg cursor-pointer',
      'text-gray-400 hover:text-gray-900 dark:hover:text-white',
      'hover:bg-gray-200 dark:hover:bg-gray-600',
      'focus:outline-none',
      'focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700',
    )}
    id={'sliding-modal-close-button'}
    data-testid={'sliding-modal-close-button'}
  >
    <HiX size={'24px'} />
  </DialogPrimitive.Close>
);

export const SlidingModalHeader: FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="w-full">
      <div
        className="w-full p-4 text-gray-500 dark:text-gray-400 text-base font-semibold"
        data-testid="sliding-modal-title"
      >
        {children}
      </div>
      <Separator className="w-full h-px block bg-gray-200 dark:bg-gray-600" />
    </div>
  );
};

export const SlidingModalContent: FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <div className="w-full p-4 overflow-auto flex-1">{children}</div>;
};

export const SlidingModalFooter: FC<ChildrenType> = ({ children }) => {
  if (children === undefined) {
    return null;
  }
  return (
    <div className="w-full">
      <Separator className="h-px block bg-gray-200 dark:bg-gray-600" />
      <div className="p-4" data-testid="sliding-modal-footer">
        {children}
      </div>
    </div>
  );
};

export const SlidingModal: FC<ModalProps> = ({
  children,
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
          className={cx('inset-0 bg-black/50 dark:bg-black/50 fixed overflow-y-auto', {
            'animate-opacity-in': wasOpen,
            'animate-opacity-out': !wasOpen,
          })}
          data-testid="sliding-modal-overlay"
        />
        <DialogPrimitive.Content
          className={cx(
            'flex flex-col fixed top-0 bottom-0',
            'overflow-hidden focus:outline-none',
            'bg-white text-gray-900',
            'dark:bg-gray-900 dark:text-white',
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
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

SlidingModal.displayName = 'SlidingModal';

export default SlidingModal;
