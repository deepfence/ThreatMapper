import { Meta, StoryFn } from '@storybook/react';
import { useState } from 'react';
import { AiOutlineMail } from 'react-icons/ai';

import { Select, SelectItem } from '@/components/select/Select';

export default {
  title: 'Components/Select',
  component: Select,
} as Meta<typeof Select>;

const Template: StoryFn<typeof Select<string>> = (args) => {
  const [value, setValue] = useState<string | undefined>();
  // TODO problem. somehow first value always gets selected.
  return (
    <Select
      {...args}
      value={value}
      name="fruit"
      onChange={(value) => {
        setValue(value);
      }}
      label="Fruit"
      placeholder="Select a fruit"
    >
      <SelectItem value="Apple" />
      <SelectItem value="Banana" />
      <SelectItem value="Grape" />
      <SelectItem value="Orange" />
      <SelectItem value="Papaya" />
      <SelectItem value="Watermalon" />
      <SelectItem value="Guava" />
      <SelectItem value="Tomato" />
      <SelectItem value="Blueberries" />
      <SelectItem value="Pear" />
      <SelectItem value="Pineapple" />
    </Select>
  );
};

export const Default = {
  render: Template,
  args: {},
};

const PreCompItem = () => {
  return <div>Citrus</div>;
};
const PreComp: StoryFn<typeof Select<string>> = (args) => {
  const [value, setValue] = useState<string | undefined>();
  // TODO problem. somehow first value always gets selected.
  return (
    <Select
      {...args}
      value={value}
      name="fruit"
      onChange={(value) => {
        setValue(value);
      }}
      label="Fruit"
      placeholder="Select a fruit"
      prefixComponent={<PreCompItem />}
    >
      <SelectItem value="Apple" />
      <SelectItem value="Banana" />
      <SelectItem value="Grape" />
      <SelectItem value="Orange" />
      <SelectItem value="Papaya" />
      <SelectItem value="Watermalon" />
      <SelectItem value="Guava" />
      <SelectItem value="Tomato" />
      <SelectItem value="Blueberries" />
      <SelectItem value="Pear" />
      <SelectItem value="Pineapple" />
    </Select>
  );
};

export const WithPrefixComponent = {
  render: PreComp,
};

export const WithPrefixComponentXS = {
  render: PreComp,

  args: {
    sizing: 'xs',
  },
};

const TemplateMulti: StoryFn<typeof Select<string[]>> = (args) => {
  const [value, setValue] = useState<string[] | undefined>([]);
  return (
    <Select
      {...args}
      value={value}
      name="fruit"
      onChange={(value) => {
        setValue(value);
      }}
      label="Fruit"
      placeholder="Select some fruits"
    >
      <SelectItem value="Apple" />
      <SelectItem value="Banana" />
      <SelectItem value="Grape" />
      <SelectItem value="Orange" />
      <SelectItem value="Papaya" />
      <SelectItem value="Watermalon" />
      <SelectItem value="Guava" />
      <SelectItem value="Tomato" />
      <SelectItem value="Blueberries" />
      <SelectItem value="Pear" />
      <SelectItem value="Pineapple" />
    </Select>
  );
};

export const MultiSelect = {
  render: TemplateMulti,

  args: {
    startIcon: <AiOutlineMail />,
    sizing: 'xs',
  },
};
