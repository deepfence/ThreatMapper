import { ComponentMeta, ComponentStory } from '@storybook/react';
import { forwardRef } from 'react';
import { HiChevronDoubleRight, HiHome } from 'react-icons/hi';

import { Breadcrumb, BreadcrumbLink } from './Breadcrumb';

export default {
  title: 'Components/BreadCrumb',
  component: Breadcrumb,
} as ComponentMeta<typeof Breadcrumb>;

export const Link = forwardRef<
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

const Template: ComponentStory<typeof Breadcrumb> = ({ separator }) => (
  <Breadcrumb separator={separator}>
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

export const BreadCrumbComponent = Template.bind({});

BreadCrumbComponent.args = {
  separator: <HiChevronDoubleRight />,
};
