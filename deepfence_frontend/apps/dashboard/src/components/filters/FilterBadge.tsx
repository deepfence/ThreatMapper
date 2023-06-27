import { TimesIcon } from '@/components/icons/common/Times';

export const FilterBadge = ({
  text,
  onRemove,
}: {
  text: string;
  onRemove: () => void;
}) => {
  return (
    <div className="flex items-center py-1 px-2.5 dark:border dark:border-accent-accent rounded-[11px] gap-2">
      <div className="text-p8 dark:text-text-input-value truncate max-w-[150px]">
        {text}
      </div>
      <button
        className="h-3.5 w-3.5 dark:text-text-input-value"
        onClick={() => {
          onRemove();
        }}
      >
        <TimesIcon />
      </button>
    </div>
  );
};
