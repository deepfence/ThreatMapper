import { Slot, Slottable } from '@radix-ui/react-slot';
import React from 'react';
import { cn } from 'tailwind-preset';

type BreadcrumbLinkType = {
  children: React.ReactNode;
  asChild?: boolean;
  icon?: React.ReactNode;
  isLast?: boolean;
  isLink?: boolean;
  className?: string;
};

type BreadCrumbProps = {
  children: React.ReactNode | React.ReactNode[];
};

const CaretIcon = () => {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.2505 19.6813L17.8661 15.2205L13.2505 10.7598C12.9885 10.5075 12.5716 10.5153 12.3192 10.7772C12.0669 11.0392 12.0747 11.4561 12.3366 11.7085L15.9726 15.2205L12.3366 18.7365C12.0747 18.9888 12.0669 19.4057 12.3192 19.6677C12.5716 19.9297 12.9885 19.9375 13.2505 19.6851V19.6813Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const BreadcrumbLink = React.forwardRef<
  React.ElementRef<'button'>,
  BreadcrumbLinkType
>(({ asChild, children, icon, isLast, className, isLink, ...props }, forwardedRef) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <>
      <Comp
        {...props}
        className={cn(
          `inline-flex items-center`,
          'text-gray-700 dark:text-text-text-and-icon text-[14px] font-normal leading-[30px]',
          {
            'dark:text-text-link': isLink,
          },
          className,
        )}
        ref={forwardedRef}
      >
        {icon && <div className="mr-1.5 w-[16px] h-[16px]">{icon}</div>}
        <Slottable>{children}</Slottable>
      </Comp>
      {!isLast && (
        <span className="ml-1.5 w-[30px] h-[30px] dark:text-df-gray-500">
          <CaretIcon />
        </span>
      )}
    </>
  );
});

export const Breadcrumb = ({ children }: BreadCrumbProps) => {
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
            isLast,
            ...child.props,
          },
          child.props.children,
        );
      }
      return elementChild;
    },
  );

  return <div className="flex w-fit items-center bg-transparent">{childrenEl}</div>;
};
