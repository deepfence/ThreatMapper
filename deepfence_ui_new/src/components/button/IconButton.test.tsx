import '@testing-library/jest-dom';

import { fireEvent } from '@testing-library/react';
import { FaPlus } from 'react-icons/fa';
import { describe, expect, it, vi } from 'vitest';

import { renderWithClient } from '../../tests/utils';
import IconButton from './IconButton';

describe(`Component IconButton`, () => {
  it(`render with label, color, icon, onClick`, () => {
    const onClick = vi.fn();
    const { getByTestId } = renderWithClient(
      <IconButton id="id" color="primary" icon={<FaPlus />} onClick={onClick} />,
    );
    const buttonId = getByTestId('icon-button-id');
    expect(buttonId).toHaveClass('bg-blue-600');

    // action
    fireEvent.click(buttonId);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
