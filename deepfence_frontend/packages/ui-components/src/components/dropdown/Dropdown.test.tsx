import '@testing-library/jest-dom';

import { describe } from 'vitest';

import { renderUI } from '../../tests/utils';
import { Dropdown, DropdownItem, DropdownSeparator } from './Dropdown';

describe('Component Dropdown', () => {
  it('render with item, style props', () => {
    const items = ['First Action', 'Second Action', 'Third Action', 'Fourth Action'];
    const component = (
      <Dropdown
        content={
          <>
            {items.map((item) => {
              return <DropdownItem key={item}>{item}</DropdownItem>;
            })}
            <DropdownSeparator />
            <DropdownItem className="text-red-500 dark:text-red-500">
              Sign Out
            </DropdownItem>
          </>
        }
        open={true}
      >
        <></>
      </Dropdown>
    );

    const { getByRole } = renderUI(component);
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
