import { ComponentPropsWithRef, forwardRef } from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { cn } from 'tailwind-preset';

const baseClassName =
  'text-text-link hover:underline focus:underline visited:text-text-link';

type AnchorProps = React.ComponentPropsWithRef<'a'> & {
  unstyled?: boolean;
};
const AAnchor = forwardRef<HTMLAnchorElement, AnchorProps>(
  ({ children, className, unstyled, ...props }, ref) => (
    <a {...props} className={cn(unstyled ? '' : baseClassName, className)} ref={ref}>
      {children}
    </a>
  ),
);
AAnchor.displayName = 'DFLink.AAnchor';

const ALink = forwardRef<
  HTMLAnchorElement,
  LinkProps & {
    unstyled?: boolean;
  }
>(({ children, className, unstyled, ...props }, ref) => (
  <Link {...props} className={cn(unstyled ? '' : baseClassName, className)} ref={ref}>
    {children}
  </Link>
));
ALink.displayName = 'DFLink.AAnchor';

type DFLinkProps = ComponentPropsWithRef<
  (typeof AAnchor | typeof ALink) & {
    unstyled?: boolean;
  }
>;
export const DFLink = forwardRef<HTMLAnchorElement, DFLinkProps>(
  (props: DFLinkProps, ref) => {
    return 'href' in props ? (
      <AAnchor {...(props as AnchorProps)} unstyled={props.unstyled} ref={ref} />
    ) : (
      <ALink {...(props as LinkProps)} unstyled={props.unstyled} ref={ref} />
    );
  },
);

DFLink.displayName = 'DFLink';
