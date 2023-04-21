import { Meta } from '@storybook/react';

import { Avatar } from '@/components/avatar/Avatar';

export default {
  title: 'Components/Avatar',
  component: Avatar,
} as Meta<typeof Avatar>;

export const AvatarAsLetter = {
  args: {
    children: 'MR',
  },
};

export const AvatarAsDefault = {
  args: {},
};

export const AvatarByImgSrc = {
  args: {
    src: '/public/vite.svg',
    alt: 'Placeholder',
  },
};
