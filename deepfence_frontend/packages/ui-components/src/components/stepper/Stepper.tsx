import { cn } from 'tailwind-preset';

type StepProps = {
  indicator: React.ReactNode;
  title: string;
  children: React.ReactNode;
};

export const Step = ({ indicator, title, children }: StepProps) => {
  return (
    <div
      className={cn(
        'relative p-1 flex flex-col dark:text-text-text-and-icon',
        `after:content-[' '] after:absolute after:left-5 after:top-10 after:bottom-0 after:w-0 after:h-auto after:border-l after:border-gray-200 dark:after:border-gray-700`,
        'last:after:hidden',
      )}
    >
      <div className="inline relative">
        <div
          className={cn(
            'absolute flex items-center justify-center w-8 h-8 border rounded-full text-h4',
            'border-gray-100 dark:border-bg-card bg-gray-100 dark:bg-bg-card',
          )}
        >
          {indicator}
        </div>
      </div>
      <h4 className="ml-12 relative mx-0 text-h4">{title}</h4>
      <div className="ml-12 mb-6">{children}</div>
    </div>
  );
};
type StepperProps = {
  children: React.ReactNode;
};

export const Stepper = ({ children }: StepperProps) => {
  return <div className="relative">{children}</div>;
};
