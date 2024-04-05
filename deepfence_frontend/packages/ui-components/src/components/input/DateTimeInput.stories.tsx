import { Meta, StoryFn, StoryObj } from '@storybook/react';

import DateTimeInput from '@/components/input/DateTimeInput';

export default {
  title: 'Components/DateTimeInput',
  component: DateTimeInput,
  argTypes: {},
} satisfies Meta<typeof DateTimeInput>;

const Template: StoryFn<typeof DateTimeInput> = (args) => {
  return (
    <DateTimeInput
      label="Select From Date"
      helperText={'Format must be correct'}
      dateInputProps={{
        onChange: (e) => console.log(e.target.value),
      }}
      timeInputProps={{
        onChange: (e) => console.log(e.target.value),
      }}
      {...args}
    ></DateTimeInput>
  );
};

export const DefaultInput: StoryObj<typeof DateTimeInput> = {
  render: Template,

  args: {
    sizing: 'md',
  },
};
