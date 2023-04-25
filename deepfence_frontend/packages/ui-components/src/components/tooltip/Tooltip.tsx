import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import cx from 'classnames';

import { Typography } from '@/components/typography/Typography';

export interface TooltipProps
  extends Pick<TooltipPrimitive.TooltipProps, 'defaultOpen' | 'open' | 'onOpenChange'> {
  placement?: 'top' | 'right' | 'bottom' | 'left';
  children: React.ReactNode;
  triggerAsChild?: boolean;
  content: string | React.ReactNode;
  delayDuration?: number;
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
            className={cx(
              'radix-side-top:animate-slide-down-fade',
              'radix-side-right:animate-slide-left-fade',
              'radix-side-bottom:animate-slide-up-fade',
              'radix-side-left:animate-slide-right-fade',
              'inline-flex items-center rounded-lg px-3 py-2 shadow-sm',
              'bg-gray-900 dark:bg-gray-700 max-w-xs',
              Typography.leading.normal,
            )}
          >
            <TooltipPrimitive.Arrow
              height={6}
              width={14}
              className="fill-gray-900 dark:fill-gray-700"
            />

            {typeof content === 'string' ? (
              <span
                className={cx(
                  'block text-white',
                  Typography.size.sm,
                  Typography.weight.medium,
                )}
                style={{
                  wordBreak: 'break-word',
                }}
              >
                {content}
              </span>
            ) : (
              content
            )}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};

Tooltip.displayName = 'Checkbox';
