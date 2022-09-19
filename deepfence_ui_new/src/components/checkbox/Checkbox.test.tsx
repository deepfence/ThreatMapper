import '@testing-library/jest-dom';

import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithClient } from '../../tests/utils';
import { Checkbox } from './Checkbox';

describe(`Component Checkbox`, () => {
  it(`render with label, style props, onCheckedChange`, () => {
    const onCheckedChange = vi.fn();
    const { getByTestId, getByText } = renderWithClient(
      <Checkbox
        label="Like"
        id="id"
        color="primary"
        onCheckedChange={onCheckedChange}
        className="bg-slate-100"
      />,
    );
    const checkboxLike = getByTestId('checkbox-id');
    expect(checkboxLike).toBeDefined();

    expect(getByText('Like')).toBeDefined();
    expect(checkboxLike).toHaveClass('bg-slate-100');

    // action
    fireEvent.click(checkboxLike);
    expect(onCheckedChange).toHaveBeenCalledOnce();
  });
});
