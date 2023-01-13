import cx from 'classnames';

import { Typography } from '@/main';

type StepProps = {
  indicator: React.ReactNode;
  title: string;
  children: React.ReactNode;
};

export const Step = ({ indicator, title, children }: StepProps) => {
  return (
    <div
      className={cx(
        'relative p-1 flex flex-col text-gray-500 dark:text-gray-400',
        `after:content-[' '] after:absolute after:left-5 after:top-10 after:bottom-0 after:w-0 after:h-auto after:border-l after:border-gray-200 dark:after:border-gray-700`,
        'last:after:hidden',
      )}
    >
      <div className={cx('inline relative')}>
        <div
          className={cx(
            'absolute flex items-center justify-center w-8 h-8 border rounded-full text-base leading-8',
            'border-gray-100 dark:border-gray-700 bg-gray-100 dark:bg-gray-700',
          )}
        >
          {indicator}
        </div>
      </div>
      <h6
        className={cx(
          'ml-12 relative mx-0 font-medium leading-tight',
          `${Typography.weight.semibold}`,
        )}
      >
        {title}
      </h6>
      <div className={cx(`ml-12 mb-6 text-sm`)}>{children}</div>
    </div>
  );
};
type StepperProps = {
  children: React.ReactNode;
};

export const Stepper = ({ children }: StepperProps) => {
  return <div className="relative">{children}</div>;
};
