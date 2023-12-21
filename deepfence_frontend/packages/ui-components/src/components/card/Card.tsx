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
        'rounded-[5px] bg-bg-card shadow-[0px_2px_4px_-2px_rgba(0,0,0,0.05),0px_4px_6px_-1px_rgba(0,0,0,0.10)]',
        className,
      )}
    >
      {props.children}
    </div>
  );
};
