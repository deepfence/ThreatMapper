import '@testing-library/jest-dom';

import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PlusIcon } from '@/components/icons/Plus';
import { TextInput } from '@/components/input/TextInput';
import { renderUI } from '@/tests/utils';

const Plus = () => (
  <span className="h-4 w-4">
    <PlusIcon />
  </span>
);

describe(`Component TextInput`, () => {
  it(`render with placehoder, label, onChange, startIcon, endIcon, helperText`, () => {
    const onChange = vi.fn();
    const { getByTestId, getByPlaceholderText, getByText, getByLabelText } = renderUI(
      <TextInput
        placeholder="test@email.com"
        id="id"
        onChange={onChange}
        label="Email"
        startIcon={<Plus />}
        helperText="Email length should not exceed 50 characters"
      />,
    );
    expect(getByPlaceholderText('test@email.com')).toBeInTheDocument();

    expect(getByLabelText('Email')).toBeInTheDocument();

    expect(getByText('Email length should not exceed 50 characters')).toBeInTheDocument();

    const textInput = getByTestId('textinput-id');
    const textInputStartIcon = getByTestId('textinput-start-icon-id');

    expect(textInputStartIcon).toBeInTheDocument();

    // action
    fireEvent.change(textInput, { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: 'hello',
        }),
      }),
    );
  });
});
