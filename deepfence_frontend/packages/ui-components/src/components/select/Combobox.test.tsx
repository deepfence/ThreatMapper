import '@testing-library/jest-dom';

import { act, fireEvent, screen } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { describe, expect } from 'vitest';

import { Combobox, ComboboxOption } from '@/main';
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
  it('Should display selected item', async () => {
    const UI = () => {
      const [selected, setSelected] = useState<(typeof OPTIONS)[number] | null>(null);
      const [options] = useState<typeof OPTIONS>([...OPTIONS]);
      const [query, setQuery] = useState('');

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
            return selected?.name ?? 'PropertyName';
          }}
        >
          {options.map((opt, index) => {
            return (
              <ComboboxOption key={`${opt.id}-${index}`} value={opt}>
                {opt.name}
              </ComboboxOption>
            );
          })}
        </Combobox>
      );
    };
    renderUI(<UI />);
    const triggerBtn = screen.getByTestId('comboboxTriggerButtonId');
    expect(triggerBtn).toHaveTextContent('PropertyName');
    await act(async () => {
      return triggerBtn.click();
    });

    const op1 = screen.getByRole('option', {
      name: 'Jon',
    });

    expect(op1).toBeInTheDocument();
    await act(async () => {
      return op1.click();
    });
    expect(triggerBtn).toHaveTextContent('Jon');
  });
  it('Should display selected item with select variant', async () => {
    const UI = () => {
      const [selected, setSelected] = useState<(typeof OPTIONS)[number] | null>(null);
      const [options] = useState<typeof OPTIONS>([...OPTIONS]);
      const [query, setQuery] = useState('');

      return (
        <Combobox
          triggerVariant="select"
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
            return selected?.name ?? 'PropertyName';
          }}
        >
          {options.map((opt, index) => {
            return (
              <ComboboxOption key={`${opt.id}-${index}`} value={opt}>
                {opt.name}
              </ComboboxOption>
            );
          })}
        </Combobox>
      );
    };
    renderUI(<UI />);
    const triggerBtn = screen.getByTestId('comboboxTriggerButtonId');
    expect(triggerBtn).toHaveTextContent('PropertyName');
    await act(async () => {
      return triggerBtn.click();
    });

    const op1 = screen.getByRole('option', {
      name: 'Jon',
    });

    expect(op1).toBeInTheDocument();
    await act(async () => {
      return op1.click();
    });
    expect(triggerBtn).toHaveTextContent('Jon');
  });
  it('Should display selected items badge count', async () => {
    const UI = () => {
      const [selected, setSelected] = useState<typeof OPTIONS>([]);
      const [options, setOptions] = useState<typeof OPTIONS>([...OPTIONS]);
      const [loading, setLoading] = useState(false);

      const [query, setQuery] = useState('');

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
          nullable
          getDisplayValue={() => {
            return 'PropertyName';
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
    renderUI(<UI />);
    const triggerBtn = screen.getByTestId('comboboxTriggerButtonId');
    expect(triggerBtn).toHaveTextContent('PropertyName');
    await act(async () => {
      return triggerBtn.click();
    });

    const op1 = screen.getByRole('option', {
      name: 'Jon',
    });

    expect(op1).toBeInTheDocument();
    await act(async () => {
      return op1.click();
    });
    expect(triggerBtn).toHaveTextContent('1');
  });
  it('Should display filter list by search input', async () => {
    const UI = () => {
      const [selected, setSelected] = useState<typeof OPTIONS>([]);
      const [options, setOptions] = useState<typeof OPTIONS>([...OPTIONS]);
      const [loading, setLoading] = useState(false);

      const [query, setQuery] = useState('');

      useEffect(() => {
        if (query.length) {
          setOptions(
            OPTIONS.filter((opt) => {
              return opt.name.toLowerCase().startsWith(query.toLowerCase());
            }),
          );
        } else {
          setOptions(OPTIONS);
        }
      }, [query]);

      return (
        <Combobox
          multiple
          nullable
          value={selected}
          onQueryChange={(query) => {
            setQuery(query);
          }}
          label="Select your value"
          onChange={(value) => {
            setSelected(value);
          }}
          clearAllElement="Clear filters"
          getDisplayValue={() => {
            return 'PropertyName';
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
    renderUI(<UI />);
    const triggerBtn = screen.getByTestId('comboboxTriggerButtonId');
    expect(triggerBtn).toHaveTextContent('PropertyName');
    await act(async () => {
      return triggerBtn.click();
    });

    const op1 = screen.getByRole('option', {
      name: 'Jon',
    });
    expect(op1).toBeInTheDocument();

    const comboboxSearchInputId = screen.getByTestId('comboboxSearchInputId');
    expect(comboboxSearchInputId).toBeInTheDocument();

    fireEvent.change(comboboxSearchInputId, {
      target: Object.assign({}, comboboxSearchInputId, { value: 'Ja' }),
    });

    // should filter list by Ja so Jon should go away
    expect(comboboxSearchInputId).toHaveValue('Ja');

    const oldOption = screen.queryByRole('option', {
      name: 'Jon',
    });
    expect(oldOption).not.toBeInTheDocument();

    const janeOption = screen.getByRole('option', {
      name: 'Jane',
    });
    const jackOption = screen.getByRole('option', {
      name: 'Jack',
    });
    expect(janeOption).toBeInTheDocument();
    expect(jackOption).toBeInTheDocument();
  });
});
