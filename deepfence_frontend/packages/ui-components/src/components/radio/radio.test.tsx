import '@testing-library/jest-dom';

import { vi } from 'vitest';

import Radio from '@/components/radio/Radio';
import { act, renderUI, screen } from '@/tests/utils';

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
    renderUI(<Radio name="test" options={radioOptions} />);
    expect(screen.getByTestId('radio-group-test').childNodes.length).toEqual(2);
    expect(screen.getByLabelText('Radio Button 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Radio Button 2')).toBeInTheDocument();
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
    renderUI(<Radio name="test" options={radioOptions} />);
    const firstRadio = screen.getByTestId('radio-item-r1');
    expect(firstRadio).toBeDisabled();
  });
  it(`should call onChange method`, () => {
    const onChange = vi.fn();
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
    renderUI(<Radio name="test" options={radioOptions} onValueChange={onChange} />);
    const firstRadio = screen.getByTestId('radio-item-r1');
    expect(firstRadio).toBeDisabled();
    const secondRadio = screen.getByTestId('radio-item-r2');
    act(() => {
      secondRadio.click();
    });
    expect(onChange).toHaveBeenCalledWith('value2');
  });
});
