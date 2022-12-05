import { ComponentMeta, ComponentStory } from '@storybook/react';

import { Avatar } from '@/components/avatar/Avatar';

export default {
  title: 'Components/Avatar',
  component: Avatar,
} as ComponentMeta<typeof Avatar>;

const Template: ComponentStory<typeof Avatar> = (args) => <Avatar {...args} />;

export const AvatarAsLetter = Template.bind({});
AvatarAsLetter.args = {
  children: 'MR',
};

export const AvatarAsDefault = Template.bind({});
AvatarAsDefault.args = {};

export const AvatarByImgSrc = Template.bind({});
AvatarByImgSrc.args = {
  src: '/public/vite.svg',
  alt: 'Placeholder',
};
