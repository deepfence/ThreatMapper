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
        'relative p-1',
        `after:content-[' '] after:absolute after:left-[1.55rem] after:top-[3rem] after:bottom-0 after:w-0 after:h-auto after:border-l after:border-gray-300 dark:after:border-gray-700`,
        'last:after:hidden',
      )}
    >
      <div className={cx('inline relative')}>
        <span
          className={cx(
            'relative inline-block w-[2.5rem] h-[2.5rem] border rounded-full text-base leading-[2.5rem] text-center',
            'border-gray-200 dark:border-gray-700 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-400',
          )}
        >
          {indicator}
        </span>
      </div>
      <h6
        className={cx(
          'inline pl-[1.5rem] relative my-[0.5rem] mx-0 text-gray-700',
          `${Typography.weight.semibold}`,
          'dark:text-gray-200',
        )}
      >
        {title}
      </h6>
      <div className={cx('ml-[4rem] dark:text-gray-400')}>{children}</div>
    </div>
  );
};
type StepperProps = {
  children: React.ReactNode;
};

export const Stepper = ({ children }: StepperProps) => {
  return <div className="relative">{children}</div>;
};
