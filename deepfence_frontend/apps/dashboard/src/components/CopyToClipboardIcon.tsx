import { useState } from 'react';
import { IconContext } from 'react-icons';
import { HiCheck, HiOutlineDuplicate } from 'react-icons/hi';
import { twMerge } from 'tailwind-merge';

type CopyToClipboardIconProps = {
  onClick: () => void;
  className?: string;
};
export const CopyToClipboardIcon = ({ onClick, className }: CopyToClipboardIconProps) => {
  const [copied, setCopied] = useState(false);

  const onCopy = (_: any) => {
    setCopied(true);
    setTimeout(() => setCopied(false), 5000);
    onClick();
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
