import { Meta, StoryFn } from '@storybook/react';
import { useState } from 'react';

import Button from '@/components/button/Button';
import { Listbox, ListboxOption } from '@/components/select/Listbox';

export default {
  title: 'Components/Listbox',
  component: Listbox,
} as Meta<typeof Listbox>;

const people = [
  {
    label:
      'Wade Cooper Wade Cooper    Wade Cooper  Wade CooperWade CooperWade CooperWade Cooper',
    value: 'wc',
  },
  { label: 'Arlene Mccoy', value: 'am' },
  { label: 'Devon Webb', value: 'dw' },
  { label: 'Tom Cook', value: 'tc' },
  { label: 'Tanya Fox', value: 'tf' },
  { label: 'Hellen Schmidt', value: 'hs' },
  { label: 'Wade Cooper', value: 'wc' },
  { label: 'Arlene Mccoy', value: 'am' },
  { label: 'Devon Webb', value: 'dw' },
  { label: 'Tom Cook', value: 'tc' },
  { label: 'Tanya Fox', value: 'tf' },
  { label: 'Hellen Schmidt', value: 'hs' },
  { label: 'Wade Cooper', value: 'wc' },
  { label: 'Arlene Mccoy', value: 'am' },
  { label: 'Devon Webb', value: 'dw' },
  { label: 'Tom Cook', value: 'tc' },
  { label: 'Tanya Fox', value: 'tf' },
  { label: 'Hellen Schmidt', value: 'hs' },
  { label: 'Wade Cooper', value: 'wc' },
  { label: 'Arlene Mccoy', value: 'am' },
  { label: 'Devon Webb', value: 'dw' },
  { label: 'Tom Cook', value: 'tc' },
  { label: 'Tanya Fox', value: 'tf' },
  { label: 'Hellen Schmidt', value: 'hs' },
];
const MultiSelectTemplate: StoryFn<typeof Listbox> = () => {
  const [selected, setSelected] = useState<typeof people>([]);

  return (
    <Listbox
      variant="underline"
      value={selected}
      label="Select your value"
      name="multiple-select"
      multiple
      getDisplayValue={() => {
        return 'PropertyName';
      }}
      onChange={(item) => {
        setSelected(item);
      }}
      clearAll={'Clear filters'}
      onClearAll={() => setSelected([])}
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

export const MultiSelect = {
  render: MultiSelectTemplate,
  args: {},
};

const SingleSelectTemplate: StoryFn<typeof Listbox> = () => {
  const [selected, setSelected] = useState<string>(people[0].value);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        formData.get('single-select'); // should be people.value
      }}
    >
      <Listbox
        value={selected}
        name="single-select"
        onChange={(item) => {
          setSelected(item);
        }}
        getDisplayValue={(item) => {
          return people.find((person) => person.value === item)?.label ?? '';
        }}
      >
        {people.map((person) => {
          return (
            <ListboxOption key={person.value} value={person.value}>
              {person.label}
            </ListboxOption>
          );
        })}
      </Listbox>
      <div className="mt-2">
        <Button type="submit">Submit</Button>
      </div>
    </form>
  );
};

export const SingleSelect = {
  render: SingleSelectTemplate,
  args: {},
};
