import '@testing-library/jest-dom';

import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState } from 'react';
import { describe, expect } from 'vitest';

import {
  ComboboxV2Content,
  ComboboxV2Item,
  ComboboxV2Provider,
  ComboboxV2TriggerButton,
  ComboboxV2TriggerInput,
} from '@/main';
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

describe('ComboboxV2', () => {
  it('Should display selected item', async () => {
    const UI = () => {
      const [selected, setSelected] = useState<string>('');
      const [options] = useState<typeof OPTIONS>([...OPTIONS]);
      const [query, setQuery] = useState('');

      return (
        <ComboboxV2Provider
          value={query}
          setValue={setQuery}
          selectedValue={selected}
          setSelectedValue={setSelected}
        >
          <ComboboxV2TriggerButton
            getDisplayValue={(selectedValue) => {
              return selectedValue.length
                ? options.find((opt) => opt.id === selectedValue)?.name
                : 'PropertyName';
            }}
          />
          <ComboboxV2Content width="fixed" searchPlaceholder="Search...">
            {options.map((opt, index) => {
              return (
                <ComboboxV2Item key={`${opt.id}-${index}`} value={opt.id}>
                  {opt.name}
                </ComboboxV2Item>
              );
            })}
          </ComboboxV2Content>
        </ComboboxV2Provider>
      );
    };
    renderUI(<UI />);
    const triggerBtn = screen.getByTestId('comboboxTriggerButtonId');
    expect(triggerBtn).toHaveTextContent('PropertyName');
    await act(async () => {
      return userEvent.click(triggerBtn);
    });
    expect(screen.queryByRole('listbox')).toBeInTheDocument();

    const op1 = screen.getByRole('option', {
      name: 'Jon',
    });
    expect(op1).toBeInTheDocument();

    await act(async () => {
      return userEvent.keyboard('{ArrowDown}');
    });
    expect(op1).toHaveAttribute('data-active-item', 'true');

    await act(async () => {
      return userEvent.click(op1);
    });
    expect(triggerBtn).toHaveTextContent('Jon');

    await act(async () => {
      return userEvent.keyboard('{Escape}');
    });
    expect(op1).not.toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
  it('Should display selected item with select variant', async () => {
    const UI = () => {
      const [selected, setSelected] = useState<string>('');
      const [options] = useState<typeof OPTIONS>([...OPTIONS]);
      const [query, setQuery] = useState('');

      return (
        <ComboboxV2Provider
          value={query}
          setValue={setQuery}
          selectedValue={selected}
          setSelectedValue={setSelected}
        >
          <ComboboxV2TriggerInput
            label="Select your value"
            getDisplayValue={(selectedValue) => {
              return selectedValue.length
                ? options.find((opt) => opt.id === selectedValue)?.name
                : 'PropertyName';
            }}
          />
          <ComboboxV2Content width="fixed" searchPlaceholder="Search...">
            {options.map((opt, index) => {
              return (
                <ComboboxV2Item key={`${opt.id}-${index}`} value={opt.id}>
                  {opt.name}
                </ComboboxV2Item>
              );
            })}
          </ComboboxV2Content>
        </ComboboxV2Provider>
      );
    };
    renderUI(<UI />);
    const triggerBtn = screen.getByTestId('comboboxTriggerInputButtonId');
    expect(triggerBtn).toHaveTextContent('PropertyName');
    await act(async () => {
      return userEvent.click(triggerBtn);
    });

    const op1 = screen.getByRole('option', {
      name: 'Jon',
    });

    expect(op1).toBeInTheDocument();
    await act(async () => {
      return userEvent.click(op1);
    });
    expect(triggerBtn).toHaveTextContent('Jon');
  });
  it('Should display selected items badge count', async () => {
    const UI = () => {
      const [selected, setSelected] = useState<string[]>([]);
      const [options, setOptions] = useState<typeof OPTIONS>([...OPTIONS]);
      const [loading, setLoading] = useState(false);

      const [query, setQuery] = useState('');

      return (
        <ComboboxV2Provider
          selectedValue={selected}
          setSelectedValue={setSelected}
          setValue={setQuery}
          loading={loading}
        >
          <ComboboxV2TriggerButton
            getDisplayValue={() => {
              return 'PropertyName';
            }}
          />
          <ComboboxV2Content
            clearButtonContent="Clear filters"
            width="fixed"
            searchPlaceholder="Search..."
          >
            {options.map((opt, index) => {
              return (
                <ComboboxV2Item key={`${opt.id}-${index}`} value={opt.id}>
                  {opt.name}
                </ComboboxV2Item>
              );
            })}
          </ComboboxV2Content>
        </ComboboxV2Provider>
      );
    };
    renderUI(<UI />);
    const triggerBtn = screen.getByTestId('comboboxTriggerButtonId');
    expect(triggerBtn).toHaveTextContent('PropertyName');
    await act(async () => {
      return userEvent.click(triggerBtn);
    });

    const op1 = screen.getByRole('option', {
      name: 'Jon',
    });

    expect(op1).toBeInTheDocument();
    await act(async () => {
      return userEvent.click(op1);
    });

    expect(triggerBtn).toHaveTextContent('1');
  });
  it('Should display filter list by search input', async () => {
    const UI = () => {
      const [selected, setSelected] = useState<string[]>([]);
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
        <ComboboxV2Provider
          selectedValue={selected}
          setSelectedValue={setSelected}
          setValue={setQuery}
          loading={loading}
        >
          <ComboboxV2TriggerButton
            getDisplayValue={() => {
              return 'PropertyName';
            }}
          />
          <ComboboxV2Content
            clearButtonContent="Clear filters"
            width="fixed"
            searchPlaceholder="Search..."
          >
            {options.map((opt, index) => {
              return (
                <ComboboxV2Item key={`${opt.id}-${index}`} value={opt.id}>
                  {opt.name}
                </ComboboxV2Item>
              );
            })}
          </ComboboxV2Content>
        </ComboboxV2Provider>
      );
    };
    renderUI(<UI />);
    const triggerBtn = screen.getByTestId('comboboxTriggerButtonId');
    expect(triggerBtn).toHaveTextContent('PropertyName');
    await act(async () => {
      return userEvent.click(triggerBtn);
    });

    const op1 = screen.getByRole('option', {
      name: 'Jon',
    });
    expect(op1).toBeInTheDocument();

    const comboboxSearchInputId = screen.getByTestId('comboboxSearchInputId');
    expect(comboboxSearchInputId).toBeInTheDocument();

    await act(async () => {
      return userEvent.type(comboboxSearchInputId, 'Ja');
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
