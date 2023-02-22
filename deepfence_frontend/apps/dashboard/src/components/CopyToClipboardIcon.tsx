import cx from 'classnames';
import { useState } from 'react';
import { IconContext } from 'react-icons';
import { HiCheck, HiOutlineDuplicate } from 'react-icons/hi';
import { MdCopyAll } from 'react-icons/md';
import { useCopyToClipboard } from 'react-use';
import { twMerge } from 'tailwind-merge';

type CopyToClipboardIconProps = {
  text: string;
  className?: string;
};
export const CopyToClipboardIcon = ({ text, className }: CopyToClipboardIconProps) => {
  const [_, copyToClipboard] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 5000);
    copyToClipboard(text);
  };

  return (
    <IconContext.Provider
      value={{
        className: twMerge('top-3 right-3 absolute w-5 h-5', className),
      }}
    >
      <button onClick={onCopy}>{copied ? <HiCheck /> : <HiOutlineDuplicate />}</button>
    </IconContext.Provider>
  );
};

export const CopyToClipboardAsJson = ({ text }: CopyToClipboardIconProps) => {
  const [_, copyToClipboard] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 5000);
    copyToClipboard(text);
  };

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
      Copy as json
    </button>
  );
};
