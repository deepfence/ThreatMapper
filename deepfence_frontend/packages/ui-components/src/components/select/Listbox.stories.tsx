import { ComponentMeta, ComponentStory } from '@storybook/react';
import { useState } from 'react';

import { ItemType, Listbox, ListboxOption } from '@/components/select/Listbox';

export default {
  title: 'Components/Listbox',
  component: Listbox,
} as ComponentMeta<typeof Listbox>;

const people = [
  { label: 'Wade Cooper', value: 'wc' },
  { label: 'Arlene Mccoy', value: 'am' },
  { label: 'Devon Webb', value: 'dw' },
  { label: 'Tom Cook', value: 'tc' },
  { label: 'Tanya Fox', value: 'tf' },
  { label: 'Hellen Schmidt', value: 'hs' },
];
const Template: ComponentStory<typeof Listbox> = () => {
  const [selected, setSelected] = useState<ItemType[]>([]);

  return (
    <Listbox
      sizing="sm"
      value={selected}
      multiple
      label="Select your value"
      onChange={(item: any) => {
        console.log(item, 'item');
        setSelected(item);
      }}
    >
      {people.map((person) => {
        return <ListboxOption key={person.value} item={person} />;
      })}
    </Listbox>
  );
};

export const Default = Template.bind({});
Default.args = {};
