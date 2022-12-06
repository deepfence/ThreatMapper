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
          `inline-flex flex-col rounded-lg
         bg-white shadow-[0px_4px_6px_-1px_rgba(0,_0,_0,_0.01),_0px_2px+4px_-2px_rgba(0,_0,_0,_0.05)] 
         dark:bg-gray-800 dark:shadow-[0px_4px_6px_-1px_rgba(0,_0,_0,_0.01),_0px_2px+4px_-2px_rgba(0,_0,_0,_0.05)] 
         ${props.className}`,
        ),
        className,
      )}
    >
      {props.children}
    </div>
  );
};
