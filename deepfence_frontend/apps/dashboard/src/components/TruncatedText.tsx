import { useEffect, useRef, useState } from 'react';
import { Tooltip } from 'ui-components';

export const TruncatedText = ({ text }: { text: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (ref.current && ref.current.scrollWidth > ref.current.clientWidth) {
      setShowTooltip(true);
    }
  }, [text]);

  return (
    <div ref={ref} className="w-full truncate">
      {showTooltip ? (
        <Tooltip content={text} triggerAsChild>
          <div className="truncate break-words">{text}</div>
        </Tooltip>
      ) : (
        text
      )}
    </div>
  );
};
