import { Meta, StoryFn, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Combobox, ComboboxOption } from '@/components/select/Combobox';
import {
  Button,
  SlidingModal,
  SlidingModalCloseButton,
  SlidingModalContent,
} from '@/main';

export default {
  title: 'Components/Combobox',
  component: Combobox,
} satisfies Meta<typeof Combobox>;

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

const SingleSelectNonNullableTemplate: StoryFn<typeof Combobox> = () => {
  const [selected, setSelected] = useState<(typeof OPTIONS)[number]>(OPTIONS[0]);
  const [options, setOptions] = useState<typeof OPTIONS>([...OPTIONS]);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState('');

  function fetchMoreData() {
    // we can use query here as well
    setLoading(true);
    setTimeout(() => {
      setOptions([...options, ...OPTIONS]);
      setLoading(false);
    }, 1000);
  }

  return (
    <Combobox
      value={selected}
      onQueryChange={(query) => {
        setQuery(query);
      }}
      label="Select your value"
      onChange={(value) => {
        setSelected(value);
      }}
      getDisplayValue={() => {
        return 'PropertyName';
      }}
      onEndReached={() => {
        fetchMoreData();
      }}
      loading={loading}
    >
      {options.map((person, index) => {
        return (
          <ComboboxOption key={`${person.id}-${index}`} value={person}>
            {person.name}
          </ComboboxOption>
        );
      })}
    </Combobox>
  );
};

export const SingleSelectNonNullable: StoryObj<typeof Combobox> = {
  render: SingleSelectNonNullableTemplate,
  args: {},
};

const MultiSelectNonNullableTemplate: StoryFn<typeof Combobox> = () => {
  const [selected, setSelected] = useState<typeof OPTIONS>([]);
  const [options, setOptions] = useState<typeof OPTIONS>([...OPTIONS]);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState('');

  function fetchMoreData() {
    // we can use query here as well
    setLoading(true);
    setTimeout(() => {
      setOptions([...options, ...OPTIONS]);
      setLoading(false);
    }, 1000);
  }

  return (
    <Combobox
      value={selected}
      onQueryChange={(query) => {
        setQuery(query);
      }}
      label="Select your value"
      clearAllElement="Clear filters"
      onChange={(value) => {
        setSelected(value);
      }}
      multiple
      getDisplayValue={() => {
        return 'PropertyName';
      }}
      onEndReached={() => {
        fetchMoreData();
      }}
      loading={loading}
    >
      {options.map((person, index) => {
        return (
          <ComboboxOption key={`${person.id}-${index}`} value={person}>
            {person.name}
          </ComboboxOption>
        );
      })}
    </Combobox>
  );
};

export const MultiSelectNonNullable: StoryObj<typeof Combobox> = {
  render: MultiSelectNonNullableTemplate,
  args: {},
};

const MultiSelectNonNullableTemplateInsideDialog: StoryFn<typeof Combobox> = () => {
  const [selected, setSelected] = useState<typeof OPTIONS>([]);
  const [options, setOptions] = useState<typeof OPTIONS>([...OPTIONS]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [query, setQuery] = useState('');

  function fetchMoreData() {
    // we can use query here as well
    setLoading(true);
    setTimeout(() => {
      setOptions([...options, ...OPTIONS]);
      setLoading(false);
    }, 1000);
  }

  return (
    <>
      <Button onClick={() => setDialogOpen(true)}>Open Modal</Button>
      <SlidingModal open={dialogOpen} onOpenChange={setDialogOpen}>
        <SlidingModalCloseButton />
        <SlidingModalContent>
          <div className="p-2">
            <Combobox
              value={selected}
              onQueryChange={(query) => {
                setQuery(query);
              }}
              label="Select your value"
              clearAllElement="Clear filters"
              onChange={(value) => {
                setSelected(value);
              }}
              multiple
              getDisplayValue={() => {
                return 'PropertyName';
              }}
              onEndReached={() => {
                fetchMoreData();
              }}
              loading={loading}
            >
              {options.map((person, index) => {
                return (
                  <ComboboxOption key={`${person.id}-${index}`} value={person}>
                    {person.name}
                  </ComboboxOption>
                );
              })}
            </Combobox>
          </div>
        </SlidingModalContent>
      </SlidingModal>
    </>
  );
};

export const MultiSelectNonNullableInsideDialog: StoryObj<typeof Combobox> = {
  render: MultiSelectNonNullableTemplateInsideDialog,
  args: {},
};
