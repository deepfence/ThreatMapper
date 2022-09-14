import '@testing-library/jest-dom';

import { describe, expect, it } from 'vitest';

import { renderWithClient } from '../../../tests/utils';
import Tabs from '../Tabs';

describe(`Component Tabs`, () => {
  it(`render two tabs`, () => {
    const tabs = [
      {
        value: 'tab1',
        label: 'Tab one',
      },
      {
        value: 'tab2',
        label: 'Tab two',
      },
    ];
    const { getByTestId, getByText } = renderWithClient(
      <Tabs tabs={tabs} defaultValue={'tab1'} value={'tab1'}>
        <span>Tab Content</span>
      </Tabs>,
    );
    expect(getByTestId('tabs-testid').childNodes.length).toEqual(2);
    expect(getByText('Tab Content')).toBeInTheDocument();
  });
});
