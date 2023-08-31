import { Meta } from '@storybook/react';

import { Avatar } from '@/components/avatar/Avatar';

export default {
  title: 'Components/Avatar',
  component: Avatar,
} satisfies Meta<typeof Avatar>;

export const AvatarAsLetter: Meta<typeof Avatar> = {
  args: {
    children: 'MR',
  },
};

export const AvatarAsDefault: Meta<typeof Avatar> = {
  args: {},
};

export const AvatarByImgSrc: Meta<typeof Avatar> = {
  args: {
    src: '/public/vite.svg',
    alt: 'Placeholder',
  },
};
