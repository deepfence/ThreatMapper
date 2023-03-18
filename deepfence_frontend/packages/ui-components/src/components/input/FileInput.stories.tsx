import { ComponentMeta, ComponentStory } from '@storybook/react';
import { useState } from 'react';

import FileInput from '@/components/input/FileInput';

export default {
  title: 'Components/FileUpload',
  component: FileInput,
  argTypes: {},
} as ComponentMeta<typeof FileInput>;

const Template: ComponentStory<typeof FileInput> = (args) => {
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

export const SmallInput = Template.bind({});
SmallInput.args = {
  sizing: 'sm',
};

export const DefaultInput = Template.bind({});
DefaultInput.args = {
  sizing: 'md',
};

export const LargeInput = Template.bind({});
LargeInput.args = {
  sizing: 'lg',
};
