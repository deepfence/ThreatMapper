import * as DialogPrimitive from '@radix-ui/react-dialog';
import React, { FC, useEffect } from 'react';
import { cn } from 'tailwind-preset';

import { useUpdateStateIfMounted } from '@/components/hooks/useUpdateStateIfMounted';

interface FocusableElement {
  focus(options?: FocusOptions): void;
}

type ChildrenType = {
  children: React.ReactNode;
};
export interface ModalProps extends DialogPrimitive.DialogProps {
  direction?: 'left' | 'right';
  size?: 's' | 'm' | 'l' | 'xl' | 'xxl';
  elementToFocusOnCloseRef?: React.RefObject<FocusableElement> | null;
}

export const SlidingModalCloseButton = () => (
  <DialogPrimitive.Close
    aria-label="Close"
    className={cn(
      'absolute right-0 mr-5 mt-5 cursor-pointer',
      'text-text-icon h-5 w-5 p-1',
    )}
    id={'sliding-modal-close-button'}
    data-testid={'sliding-modal-close-button'}
  >
    <DismissIcon />
  </DialogPrimitive.Close>
);

export const SlidingModalHeader: FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div
      className="w-full dark:text-text-input-value text-text-text-and-icon"
      data-testid="sliding-modal-title"
    >
      {children}
    </div>
  );
};

export const SlidingModalContent: FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <div className="w-full overflow-auto flex-1">{children}</div>;
};

export const SlidingModalFooter: FC<ChildrenType> = ({ children }) => {
  if (children === undefined) {
    return null;
  }
  return (
    <div className="w-full" data-testid="sliding-modal-footer">
      {children}
    </div>
  );
};

export const SlidingModal: FC<ModalProps> = ({
  children,
  elementToFocusOnCloseRef,
  open,
  size = 'm',
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
          className={cn(
            'inset-0 bg-black/50 dark:bg-bg-left-nav/80 fixed overflow-y-auto',
            {
              'animate-opacity-in': wasOpen,
              'animate-opacity-out': !wasOpen,
            },
          )}
          data-testid="sliding-modal-overlay"
        >
          <DialogPrimitive.Content
            className={cn(
              'flex flex-col fixed top-0 bottom-0',
              'overflow-hidden focus:outline-none',
              'bg-white text-gray-900',
              'dark:bg-bg-side-panel text-text-text-and-icon bg-white',
              'dark:border-bg-grid-border border-bg-border-form isolate',
              {
                '-left-[100%] border-r': direction === 'left',
                '-right-[100%] border-l': direction === 'right',
                [inAnimation]: wasOpen,
                [outAnimation]: !wasOpen,
                'w-[480px]': size === 's',
                'w-[560px]': size === 'm',
                'w-[640px]': size === 'l',
                'w-[720px]': size === 'xl',
                'w-[800px]': size === 'xxl',
              },
            )}
            onCloseAutoFocus={() => elementToFocusOnCloseRef?.current?.focus()}
          >
            {children}
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

const DismissIcon = () => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.88173 5.98639L11.8557 1.0257C12.0596 0.788284 12.0459 0.434373 11.8243 0.213345C11.6026 -0.00768377 11.2478 -0.0213538 11.0097 0.181967L6.03573 5.14266L1.06174 0.175983C0.82647 -0.0586609 0.445018 -0.0586609 0.209745 0.175983C-0.025528 0.410626 -0.025528 0.791059 0.209745 1.0257L5.18974 5.98639L0.209745 10.9471C0.0385195 11.0933 -0.0360639 11.3229 0.0166591 11.5415C0.0693821 11.7601 0.240513 11.9308 0.459693 11.9834C0.678873 12.036 0.90911 11.9616 1.05574 11.7908L6.03573 6.83013L11.0097 11.7908C11.2478 11.9941 11.6026 11.9805 11.8243 11.7594C12.0459 11.5384 12.0596 11.1845 11.8557 10.9471L6.88173 5.98639Z"
        fill="currentColor"
      />
    </svg>
  );
};

SlidingModal.displayName = 'SlidingModal';

export default SlidingModal;
