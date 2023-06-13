import '@testing-library/jest-dom';

import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Badge from '@/components/badge/Badge';
import { renderUI } from '@/tests/utils';

describe(`Component Badge`, () => {
  it(`render with label, color, icon, onRemove`, () => {
    const onRemove = vi.fn();
    const { getByTestId, getByText } = renderUI(
      <Badge label="Test badge" id="test-label-id" color="blue" />,
    );
    const badgeId = getByTestId('badge-test-label-id');
    const badgeIconId = getByTestId('badge-icon');
    expect(getByText('Test badge')).toBeInTheDocument();
    expect(badgeId).toHaveClass('text-blue-800');
    expect(badgeIconId).toBeInTheDocument();

    // action
    const removeBtn = getByTestId('badge-remove-test-label-id');
    expect(removeBtn).toBeInTheDocument();

    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
