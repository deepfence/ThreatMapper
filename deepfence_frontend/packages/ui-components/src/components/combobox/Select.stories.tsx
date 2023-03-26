import { ComponentMeta, ComponentStory } from '@storybook/react';
import { useState } from 'react';
import {  MultipleComboBox } from '@/components/combobox/Select';

export default {
  title: 'Components/combobox',
  component: MultipleComboBox,
} as ComponentMeta<typeof MultipleComboBox>;



const MultiSelectCombo: ComponentStory<typeof MultipleComboBox> = (args) => {
  const [value, setValue] = useState<any>();
  console.log("value98",value);
  
  return (
    <MultipleComboBox {...args} onChange={(value) => {
      setValue(value);
    }}/>
  );
};


export const Default = MultiSelectCombo.bind({});
Default.args = {
  name: 'Fruits',
  options: [
    {
      label: 'To Kill a Mockingbird1',
      value: 1,
    },
    {
      label: 'War and Peace',
      value: 2,
    },
    {
      label: 'The Idiot',
      value: 3,
    },
    {
      label: 'To Kill a Mockingbird14',
      value: 4,
    },
    {
      label: 'War and Peace5',
      value: 5,
    },
    {
      label: 'The Idiot6',
      value: 6,
    },
    {
      label: 'To Kill a Mockingbird17',
      value: 7,
    },
    {
      label: 'War and Peace8',
      value: 8,
    },
    {
      label: 'The Idiot9',
      value: 9,
    },
  ],
  label:"Select",
  placeholder:"Select a Book"
};


export const multipleSelect = MultiSelectCombo.bind({});
multipleSelect.args = {
  multiSelect: true,
  name: 'Fruits',
  options: [
    {
      label: 'To Kill a Mockingbird1',
      value: 1,
    },
    {
      label: 'War and Peace',
      value: 2,
    },
    {
      label: 'The Idiot',
      value: 3,
    },
    {
      label: 'To Kill a Mockingbird14',
      value: 4,
    },
    {
      label: 'War and Peace5',
      value: 5,
    },
    {
      label: 'The Idiot6',
      value: 6,
    },
    {
      label: 'To Kill a Mockingbird17',
      value: 7,
    },
    {
      label: 'War and Peace8',
      value: 8,
    },
    {
      label: 'The Idiot9',
      value: 9,
    },
  ],
  label:"Select",
  placeholder:"Select a Book"
};