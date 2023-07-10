import { useEffect, useRef, useState } from 'react';
import { useCopyToClipboard } from 'react-use';

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
