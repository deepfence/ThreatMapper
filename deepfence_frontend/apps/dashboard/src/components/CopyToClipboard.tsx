import { useEffect, useRef, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { cn } from 'tailwind-preset';
import { IconButton } from 'ui-components';

import { CheckIcon } from '@/components/icons/common/Check';
import { CopyLineIcon } from '@/components/icons/common/CopyLine';

export function useCopyToClipboardState() {
  const [_, copyToClipboard] = useCopyToClipboard();
  const [isCopied, setIsCopied] = useState(false);
  const timeoutIdRef = useRef<number | null>();

  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    };
  }, []);

  return {
    copy: (data: string) => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      copyToClipboard(data);
      setIsCopied(true);
      timeoutIdRef.current = setTimeout(() => {
        setIsCopied(false);
      }, 5000);
    },
    isCopied: isCopied,
  };
}

export const CopyButton = ({
  value,
  className,
  iconStyle,
}: {
  value: string;
  className?: string;
  iconStyle?: string;
}) => {
  const { copy, isCopied } = useCopyToClipboardState();

  return (
    <div className={cn('absolute right-0 top-0', className)}>
      {isCopied ? (
        <IconButton
          size="sm"
          variant="flat"
          color="success"
          type="button"
          icon={
            <span className={cn('w-3 h-3 block', iconStyle)}>
              <CheckIcon />
            </span>
          }
        />
      ) : (
        <IconButton
          size="sm"
          variant="flat"
          type="button"
          onClick={() => copy(value)}
          icon={
            <span className={cn('w-3 h-3 block', iconStyle)}>
              <CopyLineIcon />
            </span>
          }
        />
      )}
    </div>
  );
};
