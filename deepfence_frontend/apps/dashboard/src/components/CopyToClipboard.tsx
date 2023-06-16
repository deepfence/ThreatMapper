import cx from 'classnames';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconContext } from 'react-icons';
import { HiCheck, HiOutlineDuplicate } from 'react-icons/hi';
import { MdCopyAll } from 'react-icons/md';
import { useCopyToClipboard } from 'react-use';
import { twMerge } from 'tailwind-merge';

/**
 * @deprecated
 */
export const CopyToClipboard = ({
  data,
  className,
  asIcon,
}: {
  data:
    | {
        [key: string]: any;
      }
    | string;
  className?: string;
  asIcon?: boolean;
}) => {
  const [_, copyToClipboard] = useCopyToClipboard();
  const mountRef = useRef<boolean>(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    () => {
      mountRef.current = false;
    };
  }, []);

  const onCopy = useCallback(() => {
    try {
      const _string = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      copyToClipboard(_string);
      setCopied(true);
      setTimeout(() => {
        if (mountRef.current) {
          setCopied(false);
        }
      }, 5000);
    } catch (error) {
      console.log(error);
      setCopied(false);
    }
  }, [data]);

  if (asIcon) {
    return (
      <IconContext.Provider
        value={{
          className: twMerge('top-3 right-3 absolute w-5 h-5', className),
        }}
      >
        <button onClick={onCopy}>{copied ? <HiCheck /> : <HiOutlineDuplicate />}</button>
      </IconContext.Provider>
    );
  }

  return (
    <button
      onClick={onCopy}
      className={cx(
        'flex items-center gap-x-1 text-xs px-2 py-1 rounded-lg',
        'bg-gray-100 dark:bg-gray-800',
        'dark:text-white',
        'outline-none focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700',
      )}
    >
      {copied ? <HiCheck /> : <MdCopyAll />}
      {copied ? 'Copied as json' : 'Copy as json'}
    </button>
  );
};

export function useCopyToClipboardState() {
  const [_, copyToClipboard] = useCopyToClipboard();
  const [isCopied, setIsCopied] = useState(false);
  const timeoutIdRef = useRef<string | null>();

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
      }, 5000) as unknown as string;
    },
    isCopied: isCopied,
  };
}
