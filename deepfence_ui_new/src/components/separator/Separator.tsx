import * as SeparatorPrimitive from '@radix-ui/react-separator';
import cx from 'classnames';
import { FC } from 'react';
import { twMerge } from 'tailwind-merge';

type SeparatorProps = {
  className?: string;
};
const Separator: FC<SeparatorProps> = ({ className = '' }) => (
  <SeparatorPrimitive.Root className={twMerge(cx(className))}></SeparatorPrimitive.Root>
);

Separator.displayName = 'Separator';

export default Separator;
