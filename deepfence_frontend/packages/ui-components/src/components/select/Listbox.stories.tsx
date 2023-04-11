import { ComponentMeta, ComponentStory } from '@storybook/react';
import { useState } from 'react';

import { Listbox, ListboxOption } from '@/components/select/Listbox';

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
  const [selected, setSelected] = useState(people[0]);

  return (
    <Listbox
      sizing="sm"
      selectedItem={selected}
      onChange={(item: any) => {
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
