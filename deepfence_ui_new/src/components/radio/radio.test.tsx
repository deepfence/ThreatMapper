import '@testing-library/jest-dom';

import { renderUI } from '../../tests/utils';
import Radio from './Radio';

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
    const { getByTestId } = renderUI(<Radio name="test" options={radioOptions} />);
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
    const { getByTestId } = renderUI(<Radio name="test" options={radioOptions} />);
    const firstRadio = getByTestId('radio-item-r1');
    expect(firstRadio).toBeDisabled();
  });
});
