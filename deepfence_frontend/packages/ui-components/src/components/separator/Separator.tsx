import * as SeparatorPrimitive from '@radix-ui/react-separator';
import cx from 'classnames';
import { FC } from 'react';
import { twMerge } from 'tailwind-merge';

type SeparatorProps = {
  className?: string;
};
const Separator: FC<SeparatorProps> = ({
  className = 'bg-gray-100 dark:bg-gray-700 h-px',
}) => (
  <SeparatorPrimitive.Root className={twMerge(cx(className))}></SeparatorPrimitive.Root>
);

Separator.displayName = 'Separator';

export default Separator;
