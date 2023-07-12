import '@testing-library/jest-dom';

import { describe } from 'vitest';

import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from '@/components/dropdown/Dropdown';
import { renderUI } from '@/tests/utils';

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
            <DropdownItem>Sign Out</DropdownItem>
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
    ).toBeInTheDocument();
  });
});
