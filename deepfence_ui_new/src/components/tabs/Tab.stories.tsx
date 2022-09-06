import { ComponentMeta, ComponentStory } from '@storybook/react';
import { FaAdn, FaAffiliatetheme, FaAirbnb } from 'react-icons/fa';

import Tab from './Tabs';

export default {
  title: 'Components/Tab',
  component: Tab,
  argTypes: {
    onValueChange: { action: 'onValueChange' },
  },
} as ComponentMeta<typeof Tab>;

const Template: ComponentStory<typeof Tab> = (args) => <Tab {...args} />;

const tabs = [
  {
    label: 'Tab One',
    value: 'Tab1',
  },
  {
    label: 'Tab Two',
    value: 'Tab2',
  },
  {
    label: 'Tab Three',
    value: 'Tab3',
  },
];
export const Default = Template.bind({});
Default.args = {
  tabs,
};

export const WithIcon = Template.bind({});
WithIcon.args = {
  tabs: [
    {
      label: 'Tab One',
      value: 'Tab1',
      icon: <FaAdn />,
    },
    {
      label: 'Tab Two',
      value: 'Tab2',
      icon: <FaAffiliatetheme />,
    },
    {
      label: 'Tab Three',
      value: 'Tab3',
      icon: <FaAirbnb />,
    },
  ],
};

export const WithContent = Template.bind({});
WithContent.args = {
  tabs: [
    {
      label: 'Tab One',
      value: 'Tab1',
      icon: <FaAdn />,
    },
    {
      label: 'Tab Two',
      value: 'Tab2',
      icon: <FaAffiliatetheme />,
    },
    {
      label: 'Tab Three',
      value: 'Tab3',
      icon: <FaAirbnb />,
    },
  ],
  value: 'tab1',
  defaultValue: 'tab1',
  children: 'This is dummy content. Place your tab component base on your click.',
};
