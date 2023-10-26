import { cva, VariantProps } from 'cva';
import { cn } from 'tailwind-preset';

import { ObjectWithNonNullableValues } from '@/types/utils';

const badgeCVA = cva(['flex items-center rounded-[3px] dark:text-text-text-inverse'], {
  variants: {
    color: {
      success: 'dark:bg-status-success',
      info: 'dark:bg-status-info',
      warning: 'dark:bg-status-warning',
      error: 'dark:bg-status-error',
    },
    variant: {
      default: '',
      global: '',
    },
    size: {
      default: 'min-h-[36px] text-p4 px-1.5',
      small: 'min-h-[24px] text-p7  pl-1.5 pr-[3px]',
    },
  },
  defaultVariants: {
    color: 'info',
    size: 'default',
    variant: 'default',
  },
});

export interface AlertProps
  extends ObjectWithNonNullableValues<VariantProps<typeof badgeCVA>> {
  text: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  onCloseClick?: () => void;
}

export const Alert = ({
  text,
  action,
  color = 'info',
  size = 'default',
  variant = 'default',
  className,
  onCloseClick,
}: AlertProps) => {
  return (
    <div className={cn(badgeCVA({ color, variant, size }), className)}>
      <div
        className={cn('flex items-center gap-1.5 flex-1', {
          'justify-center': variant === 'global',
        })}
      >
        <div className="h-6 w-6 shrink-0">
          <AlertIcon color={color} />
        </div>
        <div className="py-1">{text}</div>
      </div>
      <div className="flex items-center gap-1.5 ml-auto">
        {action && <div>{action}</div>}
        <button className="h-[18px] w-[18px] shrink-0" onClick={onCloseClick}>
          <DismissIcon />
        </button>
      </div>
    </div>
  );
};

const AlertIcon = (props: { color: AlertProps['color'] }) => {
  if (props?.color === 'error') {
    return <ErrorIcon />;
  } else if (props?.color === 'warning') {
    return <WarningIcon />;
  } else if (props?.color === 'success') {
    return <SuccessIcon />;
  }
  return <InfoIcon />;
};

const SuccessIcon = () => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>
        <path
          id="icon_2"
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 9.87827 19.1571 7.84344 17.6569 6.34315C16.1566 4.84285 14.1217 4 12 4ZM12 18.6667C8.3181 18.6667 5.33333 15.6819 5.33333 12C5.33333 8.3181 8.3181 5.33333 12 5.33333C15.6819 5.33333 18.6667 8.3181 18.6667 12C18.6667 13.7681 17.9643 15.4638 16.714 16.714C15.4638 17.9643 13.7681 18.6667 12 18.6667ZM7.56 12.4933L10.8933 15.8267L16.3533 10.3667C16.5799 10.1022 16.5646 9.70787 16.3184 9.46162C16.0721 9.21538 15.6778 9.20015 15.4133 9.42667L10.8933 13.9467L8.5 11.5533C8.23549 11.3268 7.8412 11.342 7.59496 11.5883C7.34871 11.8345 7.33348 12.2288 7.56 12.4933Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};

const InfoIcon = () => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 12C4 7.58172 7.58172 4 12 4C14.1217 4 16.1566 4.84285 17.6569 6.34315C19.1571 7.84344 20 9.87827 20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12ZM12.8867 7.93333C12.8867 8.4488 12.4688 8.86667 11.9533 8.86667C11.4379 8.86667 11.02 8.4488 11.02 7.93333C11.02 7.41787 11.4379 7 11.9533 7C12.4688 7 12.8867 7.41787 12.8867 7.93333ZM12 18.6667C8.3181 18.6667 5.33333 15.6819 5.33333 12C5.33333 8.3181 8.3181 5.33333 12 5.33333C15.6819 5.33333 18.6667 8.3181 18.6667 12C18.6667 13.7681 17.9643 15.4638 16.714 16.714C15.4638 17.9643 13.7681 18.6667 12 18.6667ZM12.6667 15.3333H14C14.3682 15.3333 14.6667 15.6318 14.6667 16C14.6667 16.3682 14.3682 16.6667 14 16.6667H10C9.63181 16.6667 9.33333 16.3682 9.33333 16C9.33333 15.6318 9.63181 15.3333 10 15.3333H11.3333L11.3333 11.3333H10.6667C10.2985 11.3333 10 11.0349 10 10.6667C10 10.2985 10.2985 10 10.6667 10H12.6667L12.6667 15.3333Z"
        fill="currentColor"
      />
    </svg>
  );
};

const WarningIcon = () => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.7267 5.06661L20.22 17.0266V17.0466C20.5562 17.6666 20.541 18.4179 20.1799 19.0238C19.8188 19.6297 19.1653 20.0006 18.46 19.9999H5.47333C4.76198 20.0045 4.10175 19.6309 3.7394 19.0187C3.37704 18.4066 3.36712 17.648 3.71333 17.0266L10.2133 5.06661C10.5635 4.42319 11.2375 4.02271 11.97 4.02271C12.7025 4.02271 13.3765 4.42319 13.7267 5.06661ZM18.46 18.6466C18.6954 18.6466 18.9133 18.5224 19.0333 18.3199C19.154 18.1177 19.1591 17.8669 19.0467 17.6599L12.5533 5.69995C12.437 5.48433 12.2117 5.34993 11.9667 5.34993C11.7216 5.34993 11.4964 5.48433 11.38 5.69995L4.88666 17.6599C4.77349 17.8668 4.77798 18.118 4.89848 18.3207C5.01898 18.5233 5.23756 18.6473 5.47333 18.6466H18.46ZM11.9667 17.1799C12.5189 17.1799 12.9667 16.7322 12.9667 16.1799C12.9667 15.6277 12.5189 15.1799 11.9667 15.1799C11.4144 15.1799 10.9667 15.6277 10.9667 16.1799C10.9667 16.7322 11.4144 17.1799 11.9667 17.1799ZM12.8667 13.3466C12.8667 13.8253 12.4786 14.2133 12 14.2133C11.7678 14.2133 11.5453 14.1202 11.3824 13.9547C11.2195 13.7893 11.1298 13.5654 11.1333 13.3333V9.33327C11.1333 8.85462 11.5213 8.4666 12 8.4666C12.4786 8.4666 12.8667 8.85462 12.8667 9.33327V13.3466Z"
        fill="currentColor"
      />
    </svg>
  );
};

const ErrorIcon = () => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 12C4 7.58172 7.58172 4 12 4C14.1217 4 16.1566 4.84285 17.6569 6.34315C19.1571 7.84344 20 9.87827 20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12ZM11.1333 12.5133C11.1333 12.992 11.5214 13.38 12 13.38C12.4786 13.38 12.8667 12.992 12.8667 12.5133V8.51333C12.8667 8.03469 12.4786 7.64667 12 7.64667C11.5214 7.64667 11.1333 8.03469 11.1333 8.51333V12.5133ZM12 18.6667C8.3181 18.6667 5.33333 15.6819 5.33333 12C5.33333 8.3181 8.3181 5.33333 12 5.33333C15.6819 5.33333 18.6667 8.3181 18.6667 12C18.6667 13.7681 17.9643 15.4638 16.714 16.714C15.4638 17.9643 13.7681 18.6667 12 18.6667ZM12.9667 15.3467C12.9667 15.899 12.519 16.3467 11.9667 16.3467C11.4144 16.3467 10.9667 15.899 10.9667 15.3467C10.9667 14.7944 11.4144 14.3467 11.9667 14.3467C12.519 14.3467 12.9667 14.7944 12.9667 15.3467Z"
        fill="currentColor"
      />
    </svg>
  );
};

const DismissIcon = () => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.7833 10.0001L14.8333 5.95007C15.0221 5.72964 15.0094 5.40107 14.8042 5.19586C14.599 4.99066 14.2704 4.97797 14.05 5.16673L9.99999 9.21673L5.94999 5.16118C5.72956 4.97241 5.40099 4.9851 5.19578 5.19031C4.99058 5.39551 4.97789 5.72409 5.16665 5.94451L9.21665 10.0001L5.1611 14.0501C5.00255 14.1858 4.9335 14.399 4.98231 14.602C5.03113 14.8049 5.18959 14.9634 5.39253 15.0122C5.59548 15.061 5.80866 14.9919 5.94443 14.8334L9.99999 10.7834L14.05 14.8334C14.2704 15.0222 14.599 15.0095 14.8042 14.8043C15.0094 14.5991 15.0221 14.2705 14.8333 14.0501L10.7833 10.0001Z"
        fill="black"
      />
    </svg>
  );
};
