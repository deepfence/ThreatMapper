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
const MultiSelectTemplate: ComponentStory<typeof Listbox> = () => {
  const [selected, setSelected] = useState<typeof people>([]);

  return (
    <Listbox
      sizing="sm"
      value={selected}
      label="Select your value"
      name="multiple-select"
      multiple
      onChange={(item) => {
        console.log(item, 'item');
        setSelected(item);
      }}
    >
      {people.map((person) => {
        return (
          <ListboxOption key={person.value} value={person}>
            {person.label}
          </ListboxOption>
        );
      })}
    </Listbox>
  );
};

export const MultiSelect = MultiSelectTemplate.bind({});
MultiSelect.args = {};

const SingleSelectTemplate: ComponentStory<typeof Listbox> = () => {
  const [selected, setSelected] = useState<(typeof people)[number]>(people[0]);

  return (
    <Listbox
      sizing="sm"
      value={selected}
      label="Person"
      name="single-select"
      onChange={(item) => {
        console.log(item, 'item');
        setSelected(item);
      }}
      getDisplayValue={(item) => item.label}
    >
      {people.map((person) => {
        return (
          <ListboxOption key={person.value} value={person}>
            {person.label}
          </ListboxOption>
        );
      })}
    </Listbox>
  );
};

export const SingleSelect = SingleSelectTemplate.bind({});
SingleSelect.args = {};
