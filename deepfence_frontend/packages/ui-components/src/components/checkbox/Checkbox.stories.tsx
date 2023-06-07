import { CheckedState } from '@radix-ui/react-checkbox';
import { Meta, StoryFn } from '@storybook/react';
import { useState } from 'react';

import { Checkbox } from '@/components/checkbox/Checkbox';

export default {
  title: 'Components/Checkbox',
  component: Checkbox,
} as Meta<typeof Checkbox>;

export const Default = {
  args: {
    label: 'Default checkbox',
  },
};

const ControlledCheckboxTemplate: StoryFn<typeof Checkbox> = (args) => {
  const [checked, setChecked] = useState<CheckedState>(false);
  return (
    <Checkbox
      {...args}
      checked={checked}
      onCheckedChange={(state) => {
        setChecked(state);
      }}
    />
  );
};

export const ControlledCheckbox = {
  render: ControlledCheckboxTemplate,

  args: {
    label: 'Controlled checkbox',
  },
};

const IndeterminateCheckboxTemplate: StoryFn<typeof Checkbox> = (args) => {
  const [checked, setChecked] = useState<CheckedState>('indeterminate');

  return (
    <Checkbox
      {...args}
      name="isGoodCheckbox"
      checked={checked}
      onCheckedChange={(state) => {
        setChecked(state);
      }}
    />
  );
};

export const IndeterminateCheckbox = {
  render: IndeterminateCheckboxTemplate,

  args: {
    label: 'Indeterminate checkbox',
  },
};
