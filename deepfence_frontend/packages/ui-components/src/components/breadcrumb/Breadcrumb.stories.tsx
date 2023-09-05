import { Meta, StoryFn } from '@storybook/react';
import { forwardRef } from 'react';

import { Breadcrumb, BreadcrumbLink } from '@/components/breadcrumb/Breadcrumb';
import { PlusIcon } from '@/components/icons/Plus';

export default {
  title: 'Components/BreadCrumb',
  component: Breadcrumb,
} satisfies Meta<typeof Breadcrumb>;

const Link = forwardRef<
  HTMLAnchorElement,
  {
    children: React.ReactNode;
    className?: string;
  }
>(({ children, className }, forwardedRef) => {
  return (
    <a href="/test" className={className} ref={forwardedRef}>
      {children}
    </a>
  );
});

const Template: StoryFn<typeof Breadcrumb> = () => (
  <Breadcrumb>
    <BreadcrumbLink
      asChild
      icon={
        <span className="h-4 w-4">
          <PlusIcon />
        </span>
      }
      isLink
    >
      <Link>Link One</Link>
    </BreadcrumbLink>
    <BreadcrumbLink asChild>
      <span>Link Two</span>
    </BreadcrumbLink>
    <BreadcrumbLink asChild>
      <span>Link Three</span>
    </BreadcrumbLink>
  </Breadcrumb>
);

export const BreadCrumbComponent: Meta<typeof Breadcrumb> = {
  render: Template,

  args: {},
};
