import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from 'tailwind-preset';

export interface TooltipProps
  extends Pick<TooltipPrimitive.TooltipProps, 'defaultOpen' | 'open' | 'onOpenChange'> {
  placement?: 'top' | 'right' | 'bottom' | 'left';
  children: React.ReactNode;
  triggerAsChild?: boolean;
  content: string | React.ReactNode;
  delayDuration?: number;
  label?: string;
  className?: string;
  arrowClassName?: string;
}

export const Tooltip = (props: TooltipProps) => {
  const {
    placement,
    children,
    triggerAsChild,
    content,
    open,
    onOpenChange,
    defaultOpen,
    delayDuration,
    label,
    className,
    arrowClassName,
  } = props;
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration ?? 0}>
      <TooltipPrimitive.Root
        open={open}
        onOpenChange={onOpenChange}
        defaultOpen={defaultOpen}
      >
        <TooltipPrimitive.Trigger asChild={triggerAsChild ?? false}>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            arrowPadding={8}
            sideOffset={4}
            side={placement}
            className={cn(
              'data-[side=top]:animate-slide-down-fade',
              'data-[side=right]:animate-slide-left-fade',
              'data-[side=bottom]:animate-slide-up-fade',
              'data-[side=left]:animate-slide-right-fade',
              'rounded-md px-2.5 py-1.5 max-w-[400px]',
              'bg-bg-tooltip',
              className,
            )}
          >
            <TooltipPrimitive.Arrow
              height={9}
              width={16}
              className={cn('fill-bg-tooltip', arrowClassName)}
            />
            <>
              {label && (
                <span
                  className={cn(
                    'text-p6',
                    'dark:text-text-input-value text-text-text-inverse',
                    'block',
                    'pb-[3px]',
                  )}
                >
                  {label}
                </span>
              )}
              {typeof content === 'string' ? (
                <span
                  className={cn(
                    'text-p4',
                    'dark:text-text-input-value text-text-text-inverse block',
                  )}
                  style={{
                    wordBreak: 'break-word',
                  }}
                >
                  <span>{content}</span>
                </span>
              ) : (
                content
              )}
            </>
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};

Tooltip.displayName = 'Checkbox';
