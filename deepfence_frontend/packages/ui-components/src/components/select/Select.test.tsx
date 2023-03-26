import '@testing-library/jest-dom';

import { act, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { AiOutlineMail } from 'react-icons/ai';
import { describe, expect, it, vi } from 'vitest';

import { Select, SelectItem } from '@/components/select/Select';
import { renderUI } from '@/tests/utils';

describe(`Component Select`, () => {
  it(`render with label`, () => {
    const { getByTestId } = renderUI(
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
    const { getByTestId } = renderUI(
      <Select<typeof a> value={a} name="fruit" label="Fruit">
        <SelectItem value="Apple" />
        <SelectItem value="Banana" />
        <SelectItem value="Grape" />
      </Select>,
    );
    expect(getByTestId('ariakit-select-fruit')).toHaveTextContent(expected);
  });

  it(`render with icon`, () => {
    const { getByTestId } = renderUI(
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

  it(`on select pick item correctly`, () => {
    const onChange = vi.fn((value) => value);
    const { getByTestId } = renderUI(
      <Select
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
    expect(selectItemApple).toBeInTheDocument();

    act(() => {
      fireEvent.click(selectItemApple);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(getByTestId('ariakit-select-fruit')).toHaveTextContent('Apple');
  });

  it(`on select shows correct selected item count for controlled component`, () => {
    const UI = () => {
      const [value, setValue] = useState<string[] | undefined>([]);
      return (
        <form>
          <Select
            value={value}
            name="fruit"
            label="Fruit"
            placeholder="Select a fruit"
            startIcon={<AiOutlineMail />}
            onChange={(value) => setValue(value)}
          >
            <SelectItem value="Apple" />
            <SelectItem value="Banana" />
            <SelectItem value="Grape" />
          </Select>
        </form>
      );
    };
    const { getByTestId } = renderUI(<UI />);

    const selectBtn = getByTestId('ariakit-select-fruit');
    expect(selectBtn).toHaveTextContent('Select a fruit');

    act(() => {
      fireEvent.click(selectBtn);
    });

    const selectItemBanana = getByTestId('ariakit-selectitem-Banana');
    expect(selectItemBanana).toBeInTheDocument();
    const selectItemGrape = getByTestId('ariakit-selectitem-Grape');
    expect(selectItemGrape).toBeInTheDocument();

    act(() => {
      fireEvent.click(selectItemBanana);
      fireEvent.click(selectItemGrape);
    });

    expect(getByTestId('ariakit-select-fruit')).toHaveTextContent('2 items selected');
  });
});
