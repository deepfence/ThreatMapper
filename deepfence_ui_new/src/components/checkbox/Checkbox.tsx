import type { ComponentProps } from 'react';
import { forwardRef } from 'react';

import { useTheme } from '../../theme/ThemeContext';

export type CheckboxProps = Omit<ComponentProps<'input'>, 'type' | 'className' | 'ref'>;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>((props, ref) => {
  const { checkbox } = useTheme().theme;
  return <input ref={ref} className={checkbox.base} type="checkbox" {...props} />;
});

Checkbox.displayName = 'Checkbox';
