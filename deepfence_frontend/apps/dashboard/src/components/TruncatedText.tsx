import { MouseEventHandler, useState } from 'react';
import { Tooltip } from 'ui-components';

export const TruncatedText = ({ text }: { text: string }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleShouldShow: MouseEventHandler<HTMLDivElement> = ({ currentTarget }) => {
    if (currentTarget.scrollWidth > currentTarget.clientWidth) {
      setShowTooltip(true);
    }
  };

  return (
    <Tooltip content={text} triggerAsChild open={showTooltip}>
      <div
        className="w-full truncate"
        onMouseEnter={handleShouldShow}
        onMouseLeave={() => {
          setShowTooltip(false);
        }}
      >
        {text}
      </div>
    </Tooltip>
  );
};
