import { Meta, StoryFn, StoryObj } from '@storybook/react';
import { useState } from 'react';

import Button from '@/components/button/Button';
import { Listbox, ListboxOption } from '@/components/select/Listbox';

export default {
  title: 'Components/Listbox',
  component: Listbox,
} satisfies Meta<typeof Listbox>;

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

export const MultiSelect: StoryObj<typeof Listbox> = {
  render: MultiSelectTemplate,
  args: {},
};

const OPTIONS = [
  {
    name: 'Jon',
    id: '1',
    age: 20,
  },
  {
    name: 'Jane',
    id: '2',
    age: 21,
  },
  {
    name: 'Jack',
    id: '3',
    age: 20,
  },
  {
    name: 'July',
    id: '4',
    age: 21,
  },
  {
    name: 'Juju',
    id: '5',
    age: 21,
  },
  {
    name: 'Jessie',
    id: '6',
    age: 21,
  },
  {
    name: 'Jessy',
    id: '7',
    age: 21,
  },
];

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

export const SingleSelect: StoryObj<typeof Listbox> = {
  render: SingleSelectTemplate,
  args: {},
};

const SingleSelectOutlineTemplate: StoryFn<typeof Listbox> = () => {
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
        variant="underline"
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

export const SingleSelectOutline: StoryObj<typeof Listbox> = {
  render: SingleSelectOutlineTemplate,
  args: {},
};

export const SingleSelectInfiniteScrollTemplate: StoryFn<typeof Listbox> = () => {
  const [selected, setSelected] = useState<(typeof OPTIONS)[number] | null>(null);
  const [options, setOptions] = useState<typeof OPTIONS>([...OPTIONS]);
  const [loading, setLoading] = useState(false);

  function fetchMoreData() {
    // we can use query here as well
    setLoading(true);
    setTimeout(() => {
      setOptions([...options, ...OPTIONS]);
      setLoading(false);
    }, 1000);
  }

  return (
    <Listbox
      value={selected}
      label="Select your value"
      onChange={(value) => {
        setSelected(value);
      }}
      getDisplayValue={() => {
        return 'Select person';
      }}
      onEndReached={() => {
        fetchMoreData();
      }}
      loading={loading}
    >
      {options.map((person, index) => {
        return (
          <ListboxOption key={`${person.id}-${index}`} value={person}>
            {person.name}
          </ListboxOption>
        );
      })}
    </Listbox>
  );
};
