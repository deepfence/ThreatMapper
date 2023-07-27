import { cn } from 'tailwind-preset';

type CardType = {
  children: React.ReactNode;
  className?: string;
};
export const Card = (props: CardType) => {
  const { className = '' } = props;
  return (
    <div className={cn('rounded-[5px] dark:bg-bg-card', className)}>{props.children}</div>
  );
};
