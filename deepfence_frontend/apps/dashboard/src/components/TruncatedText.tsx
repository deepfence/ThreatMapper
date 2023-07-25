import { MouseEventHandler, useEffect, useRef, useState } from 'react';
import { Tooltip } from 'ui-components';

const delay = 200;

export const TruncatedText = ({ text }: { text: string }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const handleShouldShow: MouseEventHandler<HTMLDivElement> = ({ currentTarget }) => {
    if (currentTarget.scrollWidth > currentTarget.clientWidth) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setShowTooltip(true);
      }, delay) as unknown as number;
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <Tooltip content={text} triggerAsChild open={showTooltip}>
      <div
        className="w-full truncate"
        onMouseEnter={handleShouldShow}
        onMouseLeave={() => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setShowTooltip(false);
        }}
      >
        {text}
      </div>
    </Tooltip>
  );
};
