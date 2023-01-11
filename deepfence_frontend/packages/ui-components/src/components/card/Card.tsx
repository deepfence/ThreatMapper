import cx from 'classnames';
import { twMerge } from 'tailwind-merge';

type CardType = {
  children: React.ReactNode;
  className?: string;
};
export const Card = (props: CardType) => {
  const { className = '' } = props;
  return (
    <div
      className={twMerge(
        cx(
          `rounded-lg overflow-hidden outline-none border border-gray-200 dark:border-gray-700
         bg-white shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),_0px_2px_4px_-2px_rgba(0,0,0,0.05)]
         dark:bg-gray-800 dark:shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.01),_0px_2px_4px_-2px_rgba(0,0,0,0.05)] 
         text-gray-900 dark:text-white`,
        ),
        className,
      )}
    >
      {props.children}
    </div>
  );
};
