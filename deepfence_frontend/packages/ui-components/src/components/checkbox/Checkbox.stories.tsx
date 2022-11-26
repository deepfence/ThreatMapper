import { CheckedState } from '@radix-ui/react-checkbox';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { useState } from 'react';

import { Checkbox } from './Checkbox';

export default {
  title: 'Components/Checkbox',
  component: Checkbox,
} as ComponentMeta<typeof Checkbox>;

const Template: ComponentStory<typeof Checkbox> = (args) => <Checkbox {...args} />;

export const Default = Template.bind({});
Default.args = {
  label: 'Default checkbox',
};

const ControlledCheckboxTemplate: ComponentStory<typeof Checkbox> = (args) => {
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

export const ControlledCheckbox = ControlledCheckboxTemplate.bind({});
ControlledCheckbox.args = {
  label: 'Controlled checkbox',
};

const IndeterminateCheckboxTemplate: ComponentStory<typeof Checkbox> = (args) => {
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

export const IndeterminateCheckbox = IndeterminateCheckboxTemplate.bind({});
IndeterminateCheckbox.args = {
  label: 'Indeterminate checkbox',
};
