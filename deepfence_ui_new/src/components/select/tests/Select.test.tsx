import '@testing-library/jest-dom';

import { act, fireEvent } from '@testing-library/react';
import { AiOutlineMail } from 'react-icons/ai';
import { describe, expect, it, vi } from 'vitest';

import { renderWithClient } from '../../../tests/utils';
import { Select, SelectItem } from '../Select';

describe(`Component Select`, () => {
  it(`render with label`, () => {
    const { getByTestId } = renderWithClient(
      <Select value={''} name="fruit" label="Fruit" placeholder="Select a fruit">
        <SelectItem value="Apple" />
        <SelectItem value="Banana" />
        <SelectItem value="Grape" />
      </Select>,
    );
    expect(getByTestId('ariakit-label-fruit')).toHaveTextContent('Fruit');
    expect(getByTestId('ariakit-select-fruit')).toHaveTextContent('Select a fruit');
  });

  test.each([
    ['Grape', 'Grape'],
    [['Grape', 'Banana'], '2 items selected'],
  ])('render with default value and value', (a, expected) => {
    const { getByTestId } = renderWithClient(
      <Select<typeof a> value={a} name="fruit" label="Fruit">
        <SelectItem value="Apple" />
        <SelectItem value="Banana" />
        <SelectItem value="Grape" />
      </Select>,
    );
    expect(getByTestId('ariakit-select-fruit')).toHaveTextContent(expected);
  });

  it(`render with icon`, () => {
    const { getByTestId } = renderWithClient(
      <Select
        value={''}
        name="fruit"
        label="Fruit"
        placeholder="Select a fruit"
        startIcon={<AiOutlineMail />}
      >
        <SelectItem value="Apple" />
        <SelectItem value="Banana" />
        <SelectItem value="Grape" />
      </Select>,
    );
    expect(getByTestId('ariakit-select-icon-fruit')).toBeInTheDocument();
  });

  it(`select onchange pick the item correctly`, () => {
    const onChange = vi.fn((value) => value);
    const { getByTestId, rerender } = renderWithClient(
      <Select
        value={''}
        name="fruit"
        label="Fruit"
        placeholder="Select a fruit"
        startIcon={<AiOutlineMail />}
        onChange={onChange}
      >
        <SelectItem value="Apple" />
        <SelectItem value="Banana" />
        <SelectItem value="Grape" />
      </Select>,
    );
    const selectBtn = getByTestId('ariakit-select-fruit');
    expect(selectBtn).toHaveTextContent('Select a fruit');

    act(() => {
      fireEvent.click(selectBtn);
    });

    const selectItemApple = getByTestId('ariakit-selectitem-Apple');
    expect(selectItemApple).toBeDefined();

    act(() => {
      fireEvent.click(selectItemApple);
    });

    rerender(
      <Select
        value={'Apple'}
        name="fruit"
        label="Fruit"
        placeholder="Select a fruit"
        startIcon={<AiOutlineMail />}
      >
        <SelectItem value="Apple" />
        <SelectItem value="Banana" />
        <SelectItem value="Grape" />
      </Select>,
    );

    expect(getByTestId('ariakit-select-fruit')).toHaveTextContent('Apple');
  });
});
