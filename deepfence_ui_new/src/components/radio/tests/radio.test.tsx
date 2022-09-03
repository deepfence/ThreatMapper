import '@testing-library/jest-dom';

import { describe, expect, it } from 'vitest';

import { renderWithClient } from '../../../tests/utils';
import Radio from '../Radio';

describe(`Component Radio`, () => {
  it(`render two radio elements`, () => {
    const radioOptions = [
      {
        value: 'value1',
        label: 'Radio Button 1',
        id: 'r1',
        disabled: true,
      },
      {
        value: 'value2',
        label: 'Radio Button 2',
        id: 'r2',
      },
    ];
    const { getByTestId } = renderWithClient(
      <Radio name="test" options={radioOptions} />,
    );
    expect(getByTestId('radio-group-test').childNodes.length).toEqual(2);
  });

  it(`render first radio with disabled`, () => {
    const radioOptions = [
      {
        value: 'value1',
        label: 'Radio Button 1',
        id: 'r1',
        disabled: true,
      },
      {
        value: 'value2',
        label: 'Radio Button 2',
        id: 'r2',
      },
    ];
    const { getByTestId } = renderWithClient(
      <Radio name="test" options={radioOptions} />,
    );
    const firstRadio = getByTestId('radio-item-r1');
    expect(firstRadio).toBeDisabled();
  });
});
