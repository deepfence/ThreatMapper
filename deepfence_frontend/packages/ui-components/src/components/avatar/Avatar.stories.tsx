import { ComponentMeta, ComponentStory } from '@storybook/react';

import { Avatar } from './Avatar';

export default {
  title: 'Components/Avatar',
  component: Avatar,
} as ComponentMeta<typeof Avatar>;

const Template: ComponentStory<typeof Avatar> = (args) => <Avatar {...args} />;

export const AvatarAsLetter = Template.bind({});
AvatarAsLetter.args = {
  asChild: true,
  children: 'M',
};

export const AvatarAsDefault = Template.bind({});
AvatarAsDefault.args = {
  asChild: true,
};

export const AvatarByImgSrc = Template.bind({});
AvatarByImgSrc.args = {
  src: '/public/vite.svg',
  alt: 'Placeholder',
};
