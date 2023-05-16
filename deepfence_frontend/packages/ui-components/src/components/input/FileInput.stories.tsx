import { Meta, StoryFn } from '@storybook/react';
import { useState } from 'react';

import FileInput from '@/components/input/FileInput';

export default {
  title: 'Components/FileUpload',
  component: FileInput,
  argTypes: {},
} as Meta<typeof FileInput>;

const Template: StoryFn<typeof FileInput> = (args) => {
  const [file, setFile] = useState<File>();
  return (
    <FileInput
      label="Select your file"
      helperText={'Format must be correct'}
      onChoosen={(e) => {
        if (e.target.files) {
          setFile(e.target.files[0]);
        }
      }}
      {...args}
    ></FileInput>
  );
};

export const SmallInput = {
  render: Template,

  args: {
    sizing: 'sm',
  },
};

export const DefaultInput = {
  render: Template,

  args: {
    sizing: 'md',
  },
};

export const LargeInput = {
  render: Template,

  args: {
    sizing: 'lg',
  },
};
