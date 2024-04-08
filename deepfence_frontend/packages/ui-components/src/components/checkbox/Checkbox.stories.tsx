import { CheckedState } from '@radix-ui/react-checkbox';
import { Meta, StoryFn, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Checkbox } from '@/components/checkbox/Checkbox';

export default {
  title: 'Components/Checkbox',
  component: Checkbox,
} satisfies Meta<typeof Checkbox>;

export const Default: StoryObj<typeof Checkbox> = {
  args: {
    label: 'Default checkbox',
    disabled: true,
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

export const ControlledCheckbox: StoryObj<typeof Checkbox> = {
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

export const IndeterminateCheckbox: StoryObj<typeof Checkbox> = {
  render: IndeterminateCheckboxTemplate,

  args: {
    label: 'Indeterminate checkbox',
  },
};
