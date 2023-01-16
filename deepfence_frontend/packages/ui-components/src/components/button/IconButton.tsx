import cx from 'classnames';
import { ComponentProps, forwardRef, useId } from 'react';
import { IconContext } from 'react-icons';

import {
  classes as buttonClasses,
  ColorType,
  SizeType,
} from '@/components/button/Button';

interface Props extends Omit<ComponentProps<'button'>, 'className' | 'color'> {
  size?: SizeType;
  icon?: React.ReactNode;
  outline?: boolean;
  color?: ColorType;
}

const classes = {
  ...buttonClasses,
  size: {
    xs: `p-[9px]`,
    sm: `p-[13px]`,
    md: `p-[15px]`,
    lg: `p-[18px]`,
    xl: `p-[20px]`,
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
  ({ size = 'md', color, disabled, outline, icon, id, ...props }, ref) => {
    const internalId = useId();
    const _id = id ? id : internalId;

    return (
      <button
        ref={ref}
        id={_id}
        data-testid={`icon-button-${_id}`}
        disabled={disabled}
        className={cx(
          'flex flex-row items-center justify-center',
          `${classes.size[size]}`,
          'rounded-full focus:outline-none select-none',
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
