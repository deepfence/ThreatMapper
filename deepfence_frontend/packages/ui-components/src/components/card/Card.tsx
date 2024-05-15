import { cn } from 'tailwind-preset';

type CardType = {
  children: React.ReactNode;
  className?: string;
};
export const Card = (props: CardType) => {
  const { className = '', children, ...rest } = props;
  return (
    <div
      className={cn(
        'text-text-text-and-icon',
        'rounded-[5px] bg-bg-card',
        'dark:shadow-none shadow-[0_0_4px_0px_rgba(34,34,34,0.20)]',
        'dark:border-none border border-bg-grid-border',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
};
