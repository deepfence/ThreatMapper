import { ComponentPropsWithRef, forwardRef } from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';

const baseClassName =
  'text-blue-600 dark:text-blue-500 hover:underline focus:underline visited:text-purple-600 dark:visited:text-purple-500';

type AnchorProps = React.ComponentPropsWithRef<'a'>;
const AAnchor = forwardRef<HTMLAnchorElement, AnchorProps>(
  ({ children, className, ...props }, ref) => (
    <a {...props} className={twMerge(baseClassName, className)} ref={ref}>
      {children}
    </a>
  ),
);
AAnchor.displayName = 'DFLink.AAnchor';

const ALink = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ children, className, ...props }, ref) => (
    <Link {...props} className={twMerge(baseClassName, className)} ref={ref}>
      {children}
    </Link>
  ),
);
ALink.displayName = 'DFLink.AAnchor';

type DFLinkProps = ComponentPropsWithRef<typeof AAnchor | typeof ALink>;
export const DFLink = forwardRef<HTMLAnchorElement, DFLinkProps>(
  (props: DFLinkProps, ref) => {
    return 'href' in props ? (
      <AAnchor {...(props as AnchorProps)} ref={ref} />
    ) : (
      <ALink {...(props as LinkProps)} ref={ref} />
    );
  },
);

DFLink.displayName = 'DFLink';
