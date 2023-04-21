import { Meta, StoryFn } from '@storybook/react';
import { forwardRef } from 'react';
import { HiChevronDoubleRight, HiHome } from 'react-icons/hi';

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

const Template: StoryFn<typeof Breadcrumb> = ({ separator }) => (
  <Breadcrumb separator={separator} outline={false}>
    <BreadcrumbLink asChild icon={<HiHome />}>
      <Link>Link One</Link>
    </BreadcrumbLink>
    <BreadcrumbLink asChild>
      <Link>Link Two</Link>
    </BreadcrumbLink>
    <BreadcrumbLink asChild>
      <Link>Link Three</Link>
    </BreadcrumbLink>
  </Breadcrumb>
);

export const BreadCrumbComponent = {
  render: Template,

  args: {
    separator: <HiChevronDoubleRight />,
  },
};
