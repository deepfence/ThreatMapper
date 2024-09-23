import { Meta, StoryFn, StoryObj } from '@storybook/react';
import { useState } from 'react';

import Button from '@/components/button/Button';
import { ListboxOptionV2, ListboxV2 } from '@/components/select-v2/Listbox';

export default {
  title: 'Components/ListboxV2',
  component: ListboxV2,
} satisfies Meta<typeof ListboxV2>;

const people = [
  {
    label:
      'Wade Cooper Wade Cooper    Wade Cooper  Wade CooperWade CooperWade CooperWade Cooper',
    value: '1',
  },
  { label: 'Arlene Mccoy', value: '2' },
  { label: 'Devon Webb', value: '3' },
  { label: 'Tom Cook', value: '4' },
  { label: 'Tanya Fox', value: '5' },
  { label: 'Hellen Schmidt', value: '6' },
  { label: 'Wade Cooper', value: '7' },
  { label: 'Matthew Peters', value: '8' },
  { label: 'John Doe', value: '9' },
  { label: 'Jane Doe', value: '10' },
  { label: 'John Smith', value: '11' },
  { label: 'Arthur Long', value: '12' },
  { label: 'Beatrice Short', value: '13' },
  { label: 'Charlie Medium', value: '14' },
  { label: 'Diana Long', value: '15' },
  { label: 'Ethan Short', value: '16' },
  { label: 'Fiona Medium', value: '17' },
  { label: 'George Long', value: '18' },
  { label: 'Henry Short', value: '19' },
  { label: 'Ivy Medium', value: '20' },
  { label: 'Jack Long', value: '21' },
  { label: 'Katherine Short', value: '22' },
  { label: 'Liam Medium', value: '23' },
  { label: 'Mia Long', value: '24' },
];

const SingleSelectTemplate: StoryFn<typeof ListboxV2> = () => {
  const [options, setOptions] = useState<typeof people>([...people]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(false);

  console.log(options);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        console.log(formData.get('single-select'));
      }}
    >
      <ListboxV2
        loading={loading}
        value={selected}
        name="single-select"
        variant="underline"
        color="error"
        label="Single Select"
        setValue={(item) => {
          setSelected(item);
        }}
        getDisplayValue={(item) => {
          return options.find((person) => person.value === item)?.label ?? '';
        }}
        onEndReached={() => {
          setLoading(true);
          setTimeout(() => {
            setOptions((prev) => {
              const newOptions = [...prev];
              const existingValues = new Set(newOptions.map((option) => option.value));
              for (let i = 0; i < 20; i++) {
                let randomValue;
                do {
                  randomValue = Math.floor(Math.random() * 1000).toString();
                } while (existingValues.has(randomValue));
                existingValues.add(randomValue);
                newOptions.push({
                  label: `Random Person ${randomValue}`,
                  value: randomValue,
                });
              }
              return newOptions;
            });
            setLoading(false);
          }, 1000);
        }}
      >
        {options.map((person) => {
          return (
            <ListboxOptionV2 key={person.value} value={person.value}>
              {person.label}
            </ListboxOptionV2>
          );
        })}
      </ListboxV2>
      <div className="mt-2">
        <Button type="submit">Submit</Button>
      </div>
    </form>
  );
};

export const SingleSelect: StoryObj<typeof ListboxV2> = {
  render: SingleSelectTemplate,
  args: {},
};

const MultipleSelectTemplate: StoryFn<typeof ListboxV2> = () => {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<typeof people>([...people]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        console.log(formData.getAll('multiple-select'));
      }}
    >
      <ListboxV2
        loading={loading}
        value={selected}
        name="multiple-select"
        variant="underline"
        color="error"
        label="Multi Select"
        helperText="This is a helper text"
        setValue={(item) => {
          setSelected(item);
        }}
        getDisplayValue={(items) => {
          return items
            .map((item) => people.find((person) => person.value === item)?.label)
            .join(', ');
        }}
        onEndReached={() => {
          setLoading(true);
          setTimeout(() => {
            setOptions((prev) => {
              const newOptions = [...prev];
              const existingValues = new Set(newOptions.map((option) => option.value));
              for (let i = 0; i < 20; i++) {
                let randomValue;
                do {
                  randomValue = Math.floor(Math.random() * 1000).toString();
                } while (existingValues.has(randomValue));
                existingValues.add(randomValue);
                newOptions.push({
                  label: `Random Person ${randomValue}`,
                  value: randomValue,
                });
              }
              return newOptions;
            });
            setLoading(false);
          }, 1000);
        }}
      >
        {options.map((person) => {
          return (
            <ListboxOptionV2 key={person.value} value={person.value}>
              {person.label}
            </ListboxOptionV2>
          );
        })}
      </ListboxV2>
      <div className="mt-2">
        <Button type="submit">Submit</Button>
      </div>
    </form>
  );
};

export const MultipleSelect: StoryObj<typeof ListboxV2> = {
  render: MultipleSelectTemplate,
  args: {},
};
