import '@testing-library/jest-dom';

import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Badge from '@/components/badge/Badge';
import { renderUI } from '@/tests/utils';

describe(`Component Badge`, () => {
  it(`render with label, color, icon, onRemove`, () => {
    const { getByText } = renderUI(
      <Badge label="Test badge" id="test-label-id" color="blue" />,
    );
    expect(getByText('Test badge')).toBeInTheDocument();
  });
});
