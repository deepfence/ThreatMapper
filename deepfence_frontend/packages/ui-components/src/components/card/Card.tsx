import cx from 'classnames';
import { twMerge } from 'tailwind-merge';

type CardType = {
  children: React.ReactNode;
  className?: string;
};
export const Card = (props: CardType) => {
  const { className = '' } = props;
  return (
    <div className={twMerge(cx(`rounded-[5px] dark:bg-bg-card`), className)}>
      {props.children}
    </div>
  );
};
