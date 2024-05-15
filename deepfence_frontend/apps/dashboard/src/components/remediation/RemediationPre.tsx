import { ReactNode } from 'react';
import { cn } from 'tailwind-preset';

import { useCopyToClipboardState } from '@/components/CopyToClipboard';
import { CheckIcon } from '@/components/icons/common/Check';
import { CopyLineIcon } from '@/components/icons/common/CopyLine';

export const RemediationPre = ({ children }: { children?: ReactNode }) => {
  const { copy, isCopied } = useCopyToClipboardState();
  return (
    <pre className="relative overflow-hidden [&>code]:block [&>code]:overflow-x-auto [&>code]:p-4 [&>code]:text-p1">
      {children}
      <button
        className={cn(
          'absolute flex gap-4 items-center dark:text-bg-hover-1 hover:text-[#1466B8] right-2 top-2 h-8 w-8 p-2 dark:bg-slate-800 rounded-md',
          {
            'text-status-success': isCopied,
          },
        )}
        onClick={(e) => {
          e.preventDefault();
          copy((children as any)?.props?.children ?? '');
        }}
      >
        {isCopied ? <CheckIcon /> : <CopyLineIcon />}
      </button>
    </pre>
  );
};
