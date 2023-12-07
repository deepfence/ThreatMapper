import '@testing-library/jest-dom';

import userEvent from '@testing-library/user-event';

import { Tooltip } from '@/components/tooltip/Tooltip';
import { act, renderUI, screen } from '@/tests/utils';

describe(`Component Tooltip`, () => {
  it(`should display hover content`, async () => {
    renderUI(
      <Tooltip content="Hi">
        <span>Hover me</span>
      </Tooltip>,
    );
    const triggerChild = screen.getByText('Hover me');
    expect(triggerChild).toBeInTheDocument();

    expect(screen.queryByText('Hi')).not.toBeInTheDocument();
    await act(async () => {
      return userEvent.hover(triggerChild);
    });
    const len = screen.getAllByText('Hi').length;
    expect(len).toBeGreaterThan(0);
  });
});
