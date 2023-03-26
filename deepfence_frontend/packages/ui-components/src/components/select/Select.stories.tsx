import { ComponentMeta, ComponentStory } from '@storybook/react';
import { useState } from 'react';
import { AiOutlineMail } from 'react-icons/ai';

import { Select, SelectItem } from '@/components/select/Select';

export default {
  title: 'Components/Select',
  component: Select,
} as ComponentMeta<typeof Select>;

const Template: ComponentStory<typeof Select<string>> = (args) => {
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

export const Default = Template.bind({});
Default.args = {};

const PreCompItem = () => {
  return <div>Citrus</div>;
};
const PreComp: ComponentStory<typeof Select<string>> = (args) => {
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

export const WithPrefixComponent = PreComp.bind({});

export const WithPrefixComponentXS = PreComp.bind({});
WithPrefixComponentXS.args = {
  sizing: 'xs',
};

const TemplateMulti: ComponentStory<typeof Select<string[]>> = (args) => {
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

export const MultiSelect = TemplateMulti.bind({});
MultiSelect.args = {
  startIcon: <AiOutlineMail />,
  sizing: 'xs',
};
