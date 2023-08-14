import { Meta, StoryFn, StoryObj } from '@storybook/react';
import { useState } from 'react';

import FileInput from '@/components/input/FileInput';

export default {
  title: 'Components/FileUpload',
  component: FileInput,
  argTypes: {},
} satisfies Meta<typeof FileInput>;

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

export const SmallInput: StoryObj<typeof FileInput> = {
  render: Template,

  args: {
    sizing: 'sm',
  },
};

export const DefaultInput: StoryObj<typeof FileInput> = {
  render: Template,

  args: {
    sizing: 'md',
  },
};

export const LargeInput: StoryObj<typeof FileInput> = {
  render: Template,

  args: {
    sizing: 'lg',
  },
};
