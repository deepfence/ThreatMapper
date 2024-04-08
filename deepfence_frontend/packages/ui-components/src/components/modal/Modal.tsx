import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, VariantProps } from 'cva';
import React, { FC, useEffect } from 'react';
import { cn } from 'tailwind-preset';

import { useUpdateStateIfMounted } from '@/components/hooks/useUpdateStateIfMounted';
import { ObjectWithNonNullableValues } from '@/types/utils';

interface FocusableElement {
  focus(options?: FocusOptions): void;
}

type ChildrenType = {
  children: React.ReactNode;
};
type SizeType = 's' | 'm' | 'l' | 'xl' | 'xxl';
export interface ModalProps
  extends DialogPrimitive.DialogProps,
    ObjectWithNonNullableValues<VariantProps<typeof contentCva>> {
  size?: SizeType;
  title?: React.ReactNode;
  footer?: React.ReactNode;
  elementToFocusOnCloseRef?: React.RefObject<FocusableElement>;
}

const ModalHeader: FC<{ title?: React.ReactNode }> = ({ title }) => {
  return (
    <>
      <div
        className={cn('pt-5', {
          'pb-[32px]': !title,
          'pb-[22px]': title,
        })}
      >
        <DialogPrimitive.Title
          className="text-h2 dark:text-text-input-value text-text-text-and-icon"
          data-testid="modal-title"
        >
          {title}
        </DialogPrimitive.Title>
      </div>

      <DialogPrimitive.Close
        aria-label="Close"
        className={cn(
          'absolute top-[30px] right-6 cursor-pointer',
          // text
          'text-text-icon',
        )}
        id={'modal-close-button'}
        data-testid={'modal-close-button'}
      >
        <CloseIcon />
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
      <div className="pb-6" data-testid="modal-footer">
        {children}
      </div>
    </>
  );
};

// TODO: To make modal body scrollable with fixed header and footer

const CloseIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
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
const contentCva = cva(
  [
    cn(
      'max-h-[90vh] relative flex flex-col overflow-x-hidden focus:outline-none',
      // border
      'border rounded border-bg-grid-border',
      // bg
      'dark:bg-bg-breadcrumb-bar bg-white',
      // text
      'text-p1 text-text-text-and-icon',
      // padding
      'px-5',
    ),
  ],
  {
    variants: {
      size: {
        s: 'w-[480px]',
        m: 'w-[560px]',
        l: 'w-[640px]',
        xl: 'w-[720px]',
        xxl: 'w-[800px]',
      },
      open: {
        true: 'animate-modal-slide-in',
        // false: 'animate-pop-out',
      },
    },
    defaultVariants: {
      size: 'm',
    },
  },
);
export const Modal: FC<ModalProps> = ({
  title,
  children,
  footer,
  elementToFocusOnCloseRef,
  size,
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
          className={cn(
            'fixed inset-0 bg-black/50 dark:bg-bg-left-nav/80 flex justify-center items-center',
          )}
        >
          <DialogPrimitive.Content
            className={contentCva({
              size,
              open: wasOpen,
            })}
            onCloseAutoFocus={() => elementToFocusOnCloseRef?.current?.focus()}
          >
            <ModalHeader title={title} />
            <div
              className={cn('overflow-y-auto h-full', {
                'pb-3': footer,
                'pb-[24px]': !footer,
              })}
            >
              {children}
            </div>
            <ModalFooter>{footer}</ModalFooter>
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

Modal.displayName = 'Modal';

export default Modal;
