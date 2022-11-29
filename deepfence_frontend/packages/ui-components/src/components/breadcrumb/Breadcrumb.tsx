import { Slot, Slottable } from '@radix-ui/react-slot';
import cx from 'classnames';
import React from 'react';
import { IconContext } from 'react-icons';
import { HiChevronRight } from 'react-icons/hi';
import { twMerge } from 'tailwind-merge';

import { Typography } from '../typography/Typography';

type BreadcrumbLinkType = {
  asChild: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
  isLast?: boolean;
  separator?: React.ReactNode;
};

type BreadCrumbType = {
  children: React.ReactNode[];
  separator?: React.ReactNode;
};

export function BreadcrumbLink({
  asChild,
  children,
  icon,
  isLast,
  separator,
}: BreadcrumbLinkType) {
  const Comp = asChild ? Slot : 'span';
  return (
    <Comp
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
}

export const Breadcrumb = ({ children, separator }: BreadCrumbType) => {
  const childrenEl = React.Children.map<React.ReactNode, React.ReactNode>(
    children,
    function (child: React.ReactNode, index) {
      const isLast = index === children.length - 1;

      if (!React.isValidElement<BreadcrumbLinkType>(child)) {
        return child;
      }

      let elementChild: React.ReactElement<BreadcrumbLinkType> = child;
      if (child.props.children) {
        elementChild = React.cloneElement<BreadcrumbLinkType>(elementChild, {
          separator,
          isLast,
          ...child.props,
        });
      }
      return elementChild;
    },
  );
  return <div className="flex items-center">{childrenEl}</div>;
};
