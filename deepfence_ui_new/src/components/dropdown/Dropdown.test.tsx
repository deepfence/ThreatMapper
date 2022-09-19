import '@testing-library/jest-dom';

import { describe } from 'vitest';

import { renderWithClient } from '../../tests/utils';
import { Dropdown, DropdownSeparator, DropdwonItem } from './Dropdown';

describe('Component Dropdown', () => {
  it('render with item, style props', () => {
    const items = ['First Action', 'Second Action', 'Third Action', 'Fourth Action'];
    const component = (
      <Dropdown
        content={
          <>
            {items.map((item) => {
              return <DropdwonItem key={item}>{item}</DropdwonItem>;
            })}
            <DropdownSeparator />
            <DropdwonItem className="text-red-500 dark:text-red-500">
              Sign Out
            </DropdwonItem>
          </>
        }
        open={true}
      >
        <></>
      </Dropdown>
    );

    const { getByRole } = renderWithClient(component);
    for (const item of items) {
      expect(
        getByRole('menuitem', {
          name: item,
        }),
      ).toBeInTheDocument();
    }
    expect(
      getByRole('menuitem', {
        name: 'Sign Out',
      }),
    ).toHaveClass('text-red-500 dark:text-red-500');
  });
});
