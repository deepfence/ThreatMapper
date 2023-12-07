import '@testing-library/jest-dom';

import { act, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { Listbox, ListboxOption } from '@/main';
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

describe('Listbox', () => {
  it('Should display selected item', async () => {
    const UI = () => {
      const [selected, setSelected] = useState<string>('');

      return (
        <Listbox
          value={selected}
          label="Select your value"
          onChange={(value) => {
            setSelected(value);
          }}
          getDisplayValue={() => {
            return selected || 'People';
          }}
        >
          {OPTIONS.map((opt, index) => {
            return (
              <ListboxOption key={`${opt.id}-${index}`} value={opt.name}>
                {opt.name}
              </ListboxOption>
            );
          })}
        </Listbox>
      );
    };
    renderUI(<UI />);
    expect(screen.getByText('Select...')).toBeInTheDocument();
    expect(screen.getByText('Select your value')).toBeInTheDocument();
    await act(async () => {
      return screen.getByText('Select your value').click();
    });

    expect(screen.getByText('Jon')).toBeInTheDocument();

    await act(async () => {
      return screen.getByText('Jon').click();
    });
    expect(screen.getByRole('button')).toHaveTextContent('Jon');
  });
  it('Should display selected items count in badge', async () => {
    const UI = () => {
      const [selected, setSelected] = useState<typeof OPTIONS>([]);

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
        >
          {OPTIONS.map((opt) => {
            return (
              <ListboxOption key={opt.id} value={opt}>
                {opt.name}
              </ListboxOption>
            );
          })}
        </Listbox>
      );
    };
    renderUI(<UI />);
    expect(screen.getByText('Select...')).toBeInTheDocument();
    expect(screen.getByText('Select your value')).toBeInTheDocument();
    await act(async () => {
      return screen.getByText('Select your value').click();
    });

    const op1 = screen.getByRole('option', {
      name: 'Jon',
    });

    const op2 = screen.getByRole('option', {
      name: 'Jane',
    });

    expect(op1).toBeInTheDocument();
    expect(op2).toBeInTheDocument();
    await act(async () => {
      return op1.click();
    });
    await act(async () => {
      return op2.click();
    });
    expect(screen.getByTestId('listboxCountBadgeId')).toHaveTextContent('2');
  });
  it('Should be able to to set select item as object', async () => {
    const UI = ({ onChange }: { onChange: (data: typeof OPTIONS | null) => void }) => {
      const [selected, setSelected] = useState<typeof OPTIONS | null>(null);

      return (
        <Listbox
          value={selected}
          label="Select your value"
          onChange={(value) => {
            onChange(value);
            setSelected(value);
          }}
          getDisplayValue={() => {
            return 'People';
          }}
        >
          {OPTIONS.map((opt, index) => {
            return (
              <ListboxOption key={`${opt.id}-${index}`} value={opt}>
                {opt.name}
              </ListboxOption>
            );
          })}
        </Listbox>
      );
    };
    renderUI(
      <UI
        onChange={(value) => {
          expect(value).toEqual({
            name: 'Jon',
            id: '1',
            age: 20,
          });
        }}
      />,
    );
    expect(screen.getByText('Select...')).toBeInTheDocument();
    expect(screen.getByText('Select your value')).toBeInTheDocument();
    await act(async () => {
      return screen.getByText('Select your value').click();
    });

    const op1 = screen.getByRole('option', {
      name: 'Jon',
    });

    expect(op1).toBeInTheDocument();
    await act(async () => {
      return op1.click();
    });
  });
  it('Should be able to clear selected items using clear button', async () => {
    const UI = () => {
      const [selected, setSelected] = useState<typeof OPTIONS>([]);
      return (
        <Listbox
          multiple
          value={selected}
          label="Select your value"
          onChange={(value) => {
            setSelected(value);
          }}
          getDisplayValue={() => {
            return `${selected.length} selected`;
          }}
          clearAll="clear"
          onClearAll={() => {
            setSelected([]);
          }}
        >
          {OPTIONS.map((opt, index) => {
            return (
              <ListboxOption key={`${opt.id}-${index}`} value={opt.name}>
                {opt.name}
              </ListboxOption>
            );
          })}
        </Listbox>
      );
    };
    renderUI(<UI />);
    expect(screen.getByText('Select...')).toBeInTheDocument();
    expect(screen.getByText('Select your value')).toBeInTheDocument();

    await act(async () => {
      return screen.getByText('Select your value').click();
    });
    expect(screen.getByText('Jon')).toBeInTheDocument();
    await act(async () => {
      return screen.getByText('Jon').click();
    });
    expect(screen.getByText('1 selected')).toBeVisible();

    // clear
    const clearbtn = screen.getByRole('button', {
      name: 'clear',
    });
    expect(clearbtn).toBeInTheDocument();
    await act(async () => {
      return clearbtn.click();
    });
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
  });
});
