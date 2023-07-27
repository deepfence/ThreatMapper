import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from 'tailwind-preset';

interface FocusableElement {
  focus(options?: FocusOptions): void;
}

export interface PopoverProps extends PopoverPrimitive.PopoverProps {
  // Trigger passed as children
  children: React.ReactNode;
  // Content that will actually be rendered in the popover
  content: React.ReactNode;
  // pass true if you want to merge passed children with default trigger button
  triggerAsChild?: boolean;
  align?: PopoverPrimitive.PopperContentProps['align'];
  elementToFocusOnCloseRef?: React.RefObject<FocusableElement> | null;
}

export const Popover: React.FC<PopoverProps> = (props) => {
  const {
    children,
    content,
    align = 'start',
    triggerAsChild,
    elementToFocusOnCloseRef,
    ...rest
  } = props;
  return (
    <PopoverPrimitive.Root {...rest}>
      <PopoverPrimitive.Trigger asChild={triggerAsChild}>
        {children}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          sideOffset={4}
          align={align}
          onCloseAutoFocus={() => elementToFocusOnCloseRef?.current?.focus()}
          className={cn(
            'data-[side=top]:animate-slide-up data-[side=bottom]:animate-slide-down',
            'shadow-md bg-white dark:bg-gray-700 min-w-[195px]',
            'rounded-md overflow-hidden',
          )}
        >
          {content}
          <PopoverPrimitive.Arrow
            height={6}
            width={14}
            className="fill-gray-300 dark:fill-gray-700"
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};
Popover.displayName = 'Popover';
