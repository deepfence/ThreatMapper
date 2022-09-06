import cx from 'classnames';
import { ComponentProps, forwardRef } from 'react';
import { IconContext } from 'react-icons';

import { classes as buttonClasses, ColorType, SizeType } from './Button';

interface Props extends Omit<ComponentProps<'button'>, 'className' | 'color'> {
  size?: SizeType;
  icon?: React.ReactNode;
  outline?: boolean;
  color?: ColorType;
}

const classes = {
  ...buttonClasses,
  size: {
    xs: `p-1 w-7 h-7`,
    sm: `p-2 w-9 h-9`,
    md: `p-2.5 w-10 h-10`,
    lg: `p-3 w-12 h-12`,
    xl: `p-3.5 w-[52px] h-[52px]`,
  },
  icon: {
    xs: 'w-2.5 h-2.5',
    sm: 'w-2.5 h-2.5',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3 h-3',
  },
};

const IconButton = forwardRef<HTMLButtonElement, Props>(
  ({ size = 'md', color, disabled, outline, icon, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cx(
          'flex flex-row items-center justify-center',
          `${classes.size[size]}`,
          'rounded-full',
          {
            [classes.color.primary]: color === 'primary' && !outline,
            [classes.outline.primary]: outline && color === 'primary',

            [classes.color.default]:
              (color === undefined && !outline) || (color === 'default' && !outline),
            [classes.outline.default]:
              (color === undefined && outline) || (color === 'default' && outline),

            [classes.color.danger]: color === 'danger' && !outline,
            [classes.outline.danger]: color === 'danger' && outline,

            [classes.color.success]: color === 'success' && !outline,
            [classes.outline.success]: color === 'success' && outline,

            [classes.disabled]: disabled,
            'dark:text-white dark:bg-gray-900 dark:hover:bg-gray-800 dark:focus:ring-2 dark:focus:ring-gray-400':
              outline,
          },
        )}
        {...props}
      >
        {icon && (
          <IconContext.Provider value={{ className: cx(classes.icon[size]) }}>
            {icon}
          </IconContext.Provider>
        )}
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';

export default IconButton;
