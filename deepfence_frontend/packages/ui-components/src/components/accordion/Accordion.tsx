import * as AccordionPrimitive from '@radix-ui/react-accordion';
import cx from 'classnames';
import React from 'react';
import { HiOutlineChevronDown } from 'react-icons/hi';
import { twMerge } from 'tailwind-merge';

export const Accordion = React.forwardRef<
  HTMLDivElement,
  AccordionPrimitive.AccordionSingleProps | AccordionPrimitive.AccordionMultipleProps
>(({ children, className, ...rest }, forwardedRef) => (
  <AccordionPrimitive.Root
    className={twMerge(cx('w-full', className))}
    ref={forwardedRef}
    {...rest}
  >
    {children}
  </AccordionPrimitive.Root>
));

export interface AccordionItemProps extends AccordionPrimitive.AccordionItemProps {
  children: React.ReactNode;
  className?: string;
}

export const AccordionItem = (props: AccordionItemProps) => {
  const { children, value = '', className = '', ...rest } = props;
  return (
    <AccordionPrimitive.Item
      value={value}
      className={twMerge(
        cx(
          'bg-gray-200 w-full overflow-hidden',
          'border-x border-t last:border-b',
          'first:rounded-t-lg last:rounded-b-lg',
          className,
        ),
      )}
      {...rest}
    >
      {children}
    </AccordionPrimitive.Item>
  );
};

export const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  AccordionPrimitive.AccordionTriggerProps
>(({ children, className, ...props }, forwardedRef) => (
  <AccordionPrimitive.Header className={cx('bg-gray-100')}>
    <AccordionPrimitive.Trigger
      className={cx(
        'px-2 py-2', // update after design system is build
        'flex outline-none text-gray-900 px-2 place-items-center',
        'w-full group',
        className,
      )}
      {...props}
      ref={forwardedRef}
    >
      <span className="mr-auto text-left">{children}</span>
      <span>
        <HiOutlineChevronDown
          aria-hidden
          className="group-radix-state-open:first:rotate-180 transition duration-550 ease-out"
        />
      </span>
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));

export const AccordionContent = React.forwardRef<
  HTMLDivElement,
  AccordionPrimitive.AccordionContentProps
>(({ children, className, ...props }, forwardedRef) => (
  <AccordionPrimitive.Content
    className={cx(
      'bg-white p-2 w-full',
      'radix-state-open:border-t',
      'radix-state-open:animate-accordion-open',
      'radix-state-closed:animate-accordion-closed',
      className,
    )}
    {...props}
    ref={forwardedRef}
  >
    <div>{children}</div>
  </AccordionPrimitive.Content>
));
