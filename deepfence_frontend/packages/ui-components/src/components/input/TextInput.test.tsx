import '@testing-library/jest-dom';

import { fireEvent } from '@testing-library/react';
import { AiOutlineCheck, AiOutlineMail } from 'react-icons/ai';
import { describe, expect, it, vi } from 'vitest';

import { TextInput } from '@/components/input/TextInput';
import { renderUI } from '@/tests/utils';

describe(`Component TextInput`, () => {
  it(`render with placehoder, label, onChange, startIcon, endIcon, helperText`, () => {
    const onChange = vi.fn();
    const { getByTestId, getByPlaceholderText, getByText, getByLabelText } = renderUI(
      <TextInput
        placeholder="test@email.com"
        id="id"
        onChange={onChange}
        label="Email"
        startIcon={<AiOutlineMail />}
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
