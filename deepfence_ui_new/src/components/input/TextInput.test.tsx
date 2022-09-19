import '@testing-library/jest-dom';

import { fireEvent } from '@testing-library/react';
import { AiOutlineCheck, AiOutlineMail } from 'react-icons/ai';
import { describe, expect, it, vi } from 'vitest';

import { renderWithClient } from '../../tests/utils';
import { TextInput } from './TextInput';

describe(`Component TextInput`, () => {
  it(`render with placehoder, label, onChange, startIcon, endIcon, helperText`, () => {
    const onChange = vi.fn();
    const { getByTestId, getByPlaceholderText, getByRole } = renderWithClient(
      <TextInput
        placeholder="test@email.com"
        id="id"
        onChange={onChange}
        label="Email"
        startIcon={<AiOutlineMail />}
        endIcon={<AiOutlineCheck />}
        helperText="Email length should not exceed 50 characters"
      />,
    );
    expect(getByPlaceholderText('test@email.com')).toBeDefined();

    expect(
      getByRole('label', {
        name: 'Email',
      }),
    ).toBeDefined();

    expect(
      getByRole('label', {
        name: 'Email length should not exceed 50 characters',
      }),
    ).toBeDefined();

    const textInput = getByTestId('textinput-id');
    const textInputStartIcon = getByTestId('textinput-start-icon-id');
    const textInputEndIcon = getByTestId('textinput-end-icon-id');

    expect(textInputStartIcon).toBeDefined();
    expect(textInputEndIcon).toBeDefined();

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
