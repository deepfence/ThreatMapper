import { cn } from 'tailwind-preset';

type CardType = {
  children: React.ReactNode;
  className?: string;
};
export const Card = (props: CardType) => {
  const { className = '' } = props;
  return (
    <div
      className={cn(
        'rounded-[5px] bg-bg-card dark:shadow-none shadow-md border border-bg-grid-border dark:border-none text-text-text-and-icon',
        className,
      )}
    >
      {props.children}
    </div>
  );
};
