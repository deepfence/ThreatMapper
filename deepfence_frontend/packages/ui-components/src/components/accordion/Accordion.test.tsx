import '@testing-library/jest-dom';

import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/accordion/Accordion';
import { renderUI } from '@/tests/utils';

const Items = ['Link 1', 'Link 2', 'Link 3'];

describe(`Component Accordion`, () => {
  it(`render correct number of accordion items`, () => {
    const { queryByText, getByText } = renderUI(
      <Accordion type="single">
        {Items.map((item: string) => {
          return (
            <AccordionItem value={item} key={item}>
              <AccordionTrigger>Click {item}</AccordionTrigger>
              <AccordionContent>Content {item}</AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>,
    );
    const item1 = getByText('Click Link 1', {
      exact: false,
    });
    const item2 = getByText('Click Link 2', {
      exact: false,
    });
    const item3 = getByText('Click Link 3', {
      exact: false,
    });
    expect(item1).toBeInTheDocument();
    expect(item2).toBeInTheDocument();
    expect(item3).toBeInTheDocument();

    let item1Content = queryByText('Content Link 1', {
      exact: false,
    });
    expect(item1Content).not.toBeInTheDocument();
    fireEvent.click(item1);

    item1Content = getByText('Content Link 1', {
      exact: false,
    });
    expect(item1Content).toBeInTheDocument();
  });
});
