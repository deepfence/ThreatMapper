import '@testing-library/jest-dom';

import { Combobox } from '@headlessui/react';
import { screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { ComboboxOption } from '@/main';
import { renderUI } from '@/tests/utils';

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

describe('Combobox', () => {
  it('Should be able to select item', async () => {
    const UI = () => {
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
          nullable
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
    const { getByRole } = renderUI(<UI />);
    // expect(
    //   getByRole('button', {
    //     name: 'People',
    //   }),
    // ).toBeInTheDocument();
  });
});
