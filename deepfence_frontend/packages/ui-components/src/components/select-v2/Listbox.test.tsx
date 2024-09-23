import '@testing-library/jest-dom';

import { act, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { ListboxOptionV2, ListboxV2 } from '@/components/select-v2/Listbox';
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

describe('ListboxV2', () => {
  it('Should display selected item', async () => {
    const UI = () => {
      const [selected, setSelected] = useState<string>('');

      return (
        <ListboxV2
          value={selected}
          label="Select your value"
          setValue={setSelected}
          getDisplayValue={() => {
            return selected || 'People';
          }}
        >
          {OPTIONS.map((opt, index) => {
            return (
              <ListboxOptionV2 key={`${opt.id}-${index}`} value={opt.name}>
                {opt.name}
              </ListboxOptionV2>
            );
          })}
        </ListboxV2>
      );
    };
    renderUI(<UI />);
    expect(screen.getByText('Select...')).toBeInTheDocument();
    expect(screen.getByText('Select your value')).toBeInTheDocument();
    await act(async () => {
      return screen.getByRole('combobox').click();
    });

    expect(screen.getByText('Jon')).toBeInTheDocument();

    await act(async () => {
      return screen.getByText('Jon').click();
    });
    expect(screen.getByRole('combobox')).toHaveTextContent('Jon');
  });
  it('Should display selected items count in badge', async () => {
    const UI = () => {
      const [selected, setSelected] = useState<string[]>([]);

      return (
        <ListboxV2
          variant="underline"
          value={selected}
          label="Select your value"
          name="multiple-select"
          getDisplayValue={() => {
            return 'PropertyName';
          }}
          setValue={setSelected}
          clearButtonContent={'Clear filters'}
        >
          {OPTIONS.map((opt) => {
            return (
              <ListboxOptionV2 key={opt.id} value={opt.id}>
                {opt.name}
              </ListboxOptionV2>
            );
          })}
        </ListboxV2>
      );
    };
    renderUI(<UI />);
    expect(screen.getByText('Select...')).toBeInTheDocument();
    expect(screen.getByText('Select your value')).toBeInTheDocument();
    await act(async () => {
      return screen.getByRole('combobox').click();
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
    const UI = ({ onChange }: { onChange: (data: string) => void }) => {
      const [selected, setSelected] = useState('');

      return (
        <ListboxV2
          value={selected}
          label="Select your value"
          setValue={(value) => {
            onChange(value);
            setSelected(value);
          }}
          getDisplayValue={() => {
            return 'People';
          }}
        >
          {OPTIONS.map((opt, index) => {
            return (
              <ListboxOptionV2 key={`${opt.id}-${index}`} value={opt.id}>
                {opt.name}
              </ListboxOptionV2>
            );
          })}
        </ListboxV2>
      );
    };
    renderUI(
      <UI
        onChange={(value) => {
          expect(value).toEqual('1');
        }}
      />,
    );
    expect(screen.getByText('Select...')).toBeInTheDocument();
    expect(screen.getByText('Select your value')).toBeInTheDocument();
    await act(async () => {
      return screen.getByRole('combobox').click();
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
      const [selected, setSelected] = useState<string[]>([]);
      return (
        <ListboxV2
          value={selected}
          label="Select your value"
          setValue={(value) => {
            setSelected(value);
          }}
          getDisplayValue={(value) => {
            return `${value.length} selected`;
          }}
          clearButtonContent="clear"
        >
          {OPTIONS.map((opt, index) => {
            return (
              <ListboxOptionV2 key={`${opt.id}-${index}`} value={opt.name}>
                {opt.name}
              </ListboxOptionV2>
            );
          })}
        </ListboxV2>
      );
    };
    renderUI(<UI />);
    expect(screen.getByText('Select...')).toBeInTheDocument();
    expect(screen.getByText('Select your value')).toBeInTheDocument();

    await act(async () => {
      return screen.getByRole('combobox').click();
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
