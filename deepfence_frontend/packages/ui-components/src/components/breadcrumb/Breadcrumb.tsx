import { Slot, Slottable } from '@radix-ui/react-slot';
import cx from 'classnames';
import React from 'react';
import { IconContext } from 'react-icons';
import { HiChevronRight } from 'react-icons/hi';
import { twMerge } from 'tailwind-merge';

import { Typography } from '@/components/typography/Typography';

type BreadcrumbLinkType = {
  children: React.ReactNode;
  asChild?: boolean;
  icon?: React.ReactNode;
  isLast?: boolean;
  separator?: React.ReactNode;
  className?: string;
};

type BreadCrumbProps = {
  children: React.ReactNode | React.ReactNode[];
  outline?: boolean;
  separator?: React.ReactNode;
  transparent?: boolean;
};

export const BreadcrumbLink = React.forwardRef<
  React.ElementRef<'button'>,
  BreadcrumbLinkType
>(({ asChild, children, icon, isLast, separator, className, ...props }, forwardedRef) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <>
      <Comp
        {...props}
        className={twMerge(
          cx(
            `inline-flex items-center leading-[21px] item-center`,
            'outline-none focus-visible:outline-none focus:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-500 focus-visible:rounded-sm',
            'text-gray-700 dark:text-gray-400 text-sm',
            className,
          ),
        )}
        ref={forwardedRef}
      >
        {icon && (
          <IconContext.Provider
            value={{
              className: 'mr-2 w-[16px] h-[16px]',
            }}
          >
            {icon}
          </IconContext.Provider>
        )}
        <Slottable>{children}</Slottable>
      </Comp>
      {!isLast && (
        <IconContext.Provider
          value={{
            className: 'mx-2 text-gray-700 dark:text-gray-400 text-sm',
          }}
        >
          {separator ? separator : <HiChevronRight />}
        </IconContext.Provider>
      )}
    </>
  );
});

export const Breadcrumb = ({
  children,
  separator,
  outline = false,
  transparent,
}: BreadCrumbProps) => {
  const childrenEl = React.Children.map<React.ReactNode, React.ReactNode>(
    children,
    function (child: React.ReactNode, index) {
      const isLast = index === React.Children.count(children) - 1;
      if (!React.isValidElement<BreadcrumbLinkType>(child)) {
        return child;
      }

      let elementChild: React.ReactElement<BreadcrumbLinkType> = child;
      if (child.props.children) {
        elementChild = React.cloneElement(
          elementChild,
          {
            separator,
            isLast,
            ...child.props,
          },
          child.props.children,
        );
      }
      return elementChild;
    },
  );

  return (
    <div
      className={cx('flex w-fit items-center rounded-lg', {
        'outline-none border border-gray-200 dark:border-gray-700': outline,
        'bg-transparent': transparent,
        'bg-gray-50 dark:bg-gray-800': !transparent,
      })}
    >
      {childrenEl}
    </div>
  );
};
