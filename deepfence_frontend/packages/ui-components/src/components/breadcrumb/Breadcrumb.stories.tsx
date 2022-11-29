import { ComponentMeta, ComponentStory } from '@storybook/react';
import { HiChevronDoubleRight, HiHome } from 'react-icons/hi';

import { Breadcrumb, BreadcrumbLink } from './Breadcrumb';

export default {
  title: 'Components/BreadCrumb',
  component: Breadcrumb,
} as ComponentMeta<typeof Breadcrumb>;

const Link = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <a href="/test" className={className}>
    {children}
  </a>
);

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
