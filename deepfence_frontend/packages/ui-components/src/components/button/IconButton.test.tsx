import '@testing-library/jest-dom';

import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import IconButton from '@/components/button/IconButton';
import { PlusIcon } from '@/components/icons/Plus';
import { renderUI } from '@/tests/utils';

const Plus = () => (
  <span className="h-4 w-4">
    <PlusIcon />
  </span>
);

describe(`Component IconButton`, () => {
  it(`render with color, icon, onClick`, () => {
    const onClick = vi.fn();
    const { getByTestId } = renderUI(
      <IconButton id="id" color="default" icon={<Plus />} onClick={onClick} />,
    );
    const buttonId = getByTestId('icon-button-id');
    expect(buttonId).toHaveClass('bg-btn-blue');

    // action
    fireEvent.click(buttonId);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
