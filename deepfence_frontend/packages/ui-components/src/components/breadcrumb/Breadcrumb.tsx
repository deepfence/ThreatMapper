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
};

type BreadCrumbProps = {
  children: React.ReactNode | React.ReactNode[];
  separator?: React.ReactNode;
};

export const BreadcrumbLink = React.forwardRef<
  React.ElementRef<'button'>,
  BreadcrumbLinkType
>(({ asChild, children, icon, isLast, separator, ...props }, forwardedRef) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      {...props}
      className={twMerge(
        cx(
          `inline-flex items-center leading-[21px] item-center`,
          'focus:outline-none focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-800',
          `text-gray-700 dark:text-gray-400 ${Typography.size.sm}`,
          {
            [`text-gray-500 dark:text-gray-300`]: isLast,
          },
        ),
      )}
      ref={forwardedRef}
    >
      {icon && (
        <IconContext.Provider
          value={{
            className: 'mr-[18px] w-[16px] h-[16px]',
          }}
        >
          {icon}
        </IconContext.Provider>
      )}
      <Slottable>{children}</Slottable>

      {!isLast && (
        <IconContext.Provider
          value={{
            className: 'mx-[23px]',
          }}
        >
          {separator ? separator : <HiChevronRight />}
        </IconContext.Provider>
      )}
    </Comp>
  );
});

export const Breadcrumb = ({ children, separator }: BreadCrumbProps) => {
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
  return <div className="flex items-center">{childrenEl}</div>;
};
