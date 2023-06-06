import '@testing-library/jest-dom';

import { fireEvent } from '@testing-library/react';
import { FaPlus } from 'react-icons/fa';
import { describe, expect, it, vi } from 'vitest';

import IconButton from '@/components/button/IconButton';
import { renderUI } from '@/tests/utils';

describe(`Component IconButton`, () => {
  it(`render with color, icon, onClick`, () => {
    const onClick = vi.fn();
    const { getByTestId } = renderUI(
      <IconButton id="id" color="default" icon={<FaPlus />} onClick={onClick} />,
    );
    const buttonId = getByTestId('icon-button-id');
    expect(buttonId).toHaveClass('bg-blue-700');

    // action
    fireEvent.click(buttonId);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
