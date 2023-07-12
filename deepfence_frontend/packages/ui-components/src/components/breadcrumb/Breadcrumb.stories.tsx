import { Meta, StoryFn } from '@storybook/react';
import { forwardRef } from 'react';
import { HiHome } from 'react-icons/hi';

import { Breadcrumb, BreadcrumbLink } from '@/components/breadcrumb/Breadcrumb';

export default {
  title: 'Components/BreadCrumb',
  component: Breadcrumb,
} as Meta<typeof Breadcrumb>;

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
    <BreadcrumbLink asChild icon={<HiHome />} isLink>
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

export const BreadCrumbComponent = {
  render: Template,

  args: {},
};
