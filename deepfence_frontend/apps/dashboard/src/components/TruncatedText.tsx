import { useRef, useState } from 'react';
import { cn } from 'tailwind-preset';
import { Tooltip } from 'ui-components';

export const TruncatedText = ({
  text,
  className,
}: {
  text: string;
  className?: string;
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);

  const inner = (
    <div
      className={cn('w-full truncate', className ?? '')}
      ref={innerRef}
      onMouseEnter={(e) => {
        if (innerRef.current) {
          setShowTooltip(innerRef.current.scrollWidth > innerRef.current.clientWidth);
        }
      }}
    >
      {text}
    </div>
  );

  if (showTooltip) {
    return (
      <Tooltip content={text} delayDuration={200} triggerAsChild>
        {inner}
      </Tooltip>
    );
  }
  return inner;
};
