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

const SingleSelectTemplate: StoryFn<typeof Combobox> = () => {
  const [selected, setSelected] = useState<(typeof OPTIONS)[number] | null>(null);
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

export const SingleSelect: StoryObj<typeof Combobox> = {
  render: SingleSelectTemplate,
  args: {},
};

const SingleSelectWithStringValuesTemplate: StoryFn<typeof Combobox> = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const [options, setOptions] = useState<typeof OPTIONS>([...OPTIONS]);

  const [query, setQuery] = useState('');

  return (
    <Combobox
      value={selected}
      triggerVariant="select"
      onQueryChange={(query) => {
        setQuery(query);
      }}
      label="Select your value"
      onChange={(value) => {
        setSelected(value);
      }}
      disabled={false}
      color="error"
      placeholder="Select a value"
      helperText="This is a helper text"
      getDisplayValue={(value) => {
        return options.find((opt) => opt.id === value)?.name ?? null;
      }}
    >
      {options
        .filter((opt) => {
          return opt.name.toLowerCase().includes(query.toLowerCase());
        })
        .map((person, index) => {
          return (
            <ComboboxOption key={`${person.id}-${index}`} value={person.id}>
              {person.name}
            </ComboboxOption>
          );
        })}
    </Combobox>
  );
};

export const SingleSelectStringValuesAndSelectTrigger: StoryObj<typeof Combobox> = {
  render: SingleSelectWithStringValuesTemplate,
  args: {},
};

const MultiSelectTemplate: StoryFn<typeof Combobox> = () => {
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
      onChange={(value) => {
        setSelected(value);
      }}
      clearAllElement="Clear filters"
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

export const MultiSelect: StoryObj<typeof Combobox> = {
  render: MultiSelectTemplate,
  args: {},
};

const MultiSelectWithSelectVariantTemplate: StoryFn<typeof Combobox> = () => {
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
      triggerVariant="select"
      value={selected}
      onQueryChange={(query) => {
        setQuery(query);
      }}
      label="Select your value"
      onChange={(value) => {
        setSelected(value);
      }}
      clearAllElement="Clear"
      multiple
      placeholder="Please select..."
      getDisplayValue={(value) => {
        return value.length ? `${value.length} selected` : null;
      }}
      onEndReached={() => {
        fetchMoreData();
      }}
      onClearAll={() => {
        setSelected([]);
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

export const MultiSelectWithSelectVariant: StoryObj<typeof Combobox> = {
  render: MultiSelectWithSelectVariantTemplate,
  args: {},
};

const MultiSelectTemplateInsideDialog: StoryFn<typeof Combobox> = () => {
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

export const MultiSelectInsideDialog: StoryObj<typeof Combobox> = {
  render: MultiSelectTemplateInsideDialog,
  args: {},
};
