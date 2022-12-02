import '@testing-library/jest-dom';

import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Switch from '@/components/switch/Switch';
import { renderUI } from '@/tests/utils';

describe(`Component Switch`, () => {
  it(`render switch with label`, () => {
    renderUI(<Switch label="With Label" />);
    expect(screen.getByText('With Label')).toBeInTheDocument();
  });

  it(`render switch with label and disabled state`, () => {
    const { getByTestId } = renderUI(
      <Switch label="With Label" id="test-label-id" disabled />,
    );
    const switchBtn = getByTestId('switch-test-label-id');
    expect(switchBtn).toBeDisabled();
  });
});
