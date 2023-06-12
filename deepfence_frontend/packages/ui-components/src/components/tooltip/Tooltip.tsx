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
  label?: string;
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
              'rounded-md pl-3 py-2 shadow-sm w-[200px]',
              'bg-bg-tooltip dark:bg-bg-tooltip',
              Typography.leading.normal,
            )}
          >
            <TooltipPrimitive.Arrow
              height={9}
              width={16}
              className="fill-bg-tooltip dark:fill-bg-tooltip"
            />
            <>
              {label && (
                <span
                  className={cx('text-p6', 'text-text-input-value', 'block', 'pb-[3px]')}
                >
                  {label}
                </span>
              )}
              {typeof content === 'string' ? (
                <span
                  className={cx('text-p5', 'text-text-input-value block')}
                  style={{
                    wordBreak: 'break-word',
                  }}
                >
                  Tooltip:<span className="pl-1">{content}</span>
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
