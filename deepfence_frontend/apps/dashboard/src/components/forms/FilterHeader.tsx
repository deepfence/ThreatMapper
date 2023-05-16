import cx from 'classnames';
import { Separator } from 'ui-components';

export const FilterHeader = ({ onReset }: { onReset: () => void }) => {
  return (
    <div>
      <h3 className="flex font-medium text-lg dark:text-gray-100 px-4 py-2">
        Filters
        <button
          className={cx(
            'px-2 rounded-lg',
            'ml-auto text-sm dark:text-gray-100',
            'hover:text-blue-600 dark:hover:text-blue-500',
            'focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700',
          )}
          onClick={onReset}
        >
          Reset
        </button>
      </h3>
      <Separator className="h-px block bg-gray-200 dark:bg-gray-600" />
    </div>
  );
};
