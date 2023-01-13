import { useState } from 'react';
import { IconContext } from 'react-icons';
import { HiCheck, HiOutlineDuplicate } from 'react-icons/hi';
import { useCopyToClipboard } from 'react-use';
import { twMerge } from 'tailwind-merge';

type CopyToClipboardIconProps = {
  text: string;
  className?: string;
};
export const CopyToClipboardIcon = ({ text, className }: CopyToClipboardIconProps) => {
  const [_, copyToClipboard] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);

  const onCopy = (_: React.MouseEvent<HTMLButtonElement>) => {
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
