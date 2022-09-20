import '@testing-library/jest-dom';

import { fireEvent, getAllByRole } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithClient } from '../../tests/utils';
import { Pagination } from './Pagination';

/**
 * Total pages of max 11 will be rendered: Previous(1) +  Next(1) + pages(9) (number or dots) = 11
 */

describe(`Component Pagination`, () => {
  it.each([
    [7, 9],
    [3, 5],
  ])('render pagination with (%i) pages with total of (%i)', (input, expected) => {
    const onPageChange = vi.fn();
    const { getByRole, getAllByRole } = renderWithClient(
      <Pagination
        currentPage={1}
        totalPageCount={input}
        onPageChange={onPageChange}
        siblingCount={2}
      />,
    );
    // check all number pages are present
    for (let i = 1; i <= input; i++) {
      expect(
        getByRole('button', {
          name: new RegExp(i + ''),
        }),
      ).toBeInTheDocument();
    }
    expect(getAllByRole('button').length).toEqual(expected);
  });

  it(`Pagination has left and right dots disabled button which are placed at correct position`, () => {
    /*
      Left and Right Dots page are renderd base on where the current page is. 
    */
    const totalRenderPage = 11; // includes Previous, Next and Dots pages
    const onPageChange = vi.fn();
    const { getAllByRole, getAllByTestId } = renderWithClient(
      <Pagination
        currentPage={5}
        totalPageCount={20}
        onPageChange={onPageChange}
        siblingCount={2}
      />,
    );

    const pages = getAllByRole('button');
    expect(pages.length).toEqual(totalRenderPage);

    const dotsPage = getAllByTestId('pagination-button-dots');

    expect(pages[2]).toEqual(dotsPage[0]); // 3rd page is a left dot page
    expect(pages[totalRenderPage - 3]).toEqual(dotsPage[1]); // 3rd last page is right dot page

    expect(dotsPage[0]).toBeDisabled();
    expect(dotsPage[1]).toBeDisabled();
  });

  it(`Pagination has only left dot button placed at 3rd page`, () => {
    /*
      Only Left dot page is present if current page is at the end of page. 
    */
    const onPageChange = vi.fn();
    const { getAllByRole, getAllByTestId } = renderWithClient(
      <Pagination
        currentPage={8}
        totalPageCount={10}
        onPageChange={onPageChange}
        siblingCount={2}
      />,
    );

    const pages = getAllByRole('button');
    const dotsPage = getAllByTestId('pagination-button-dots');
    // only left dot page is present
    expect(dotsPage.length).toEqual(1);
    expect(pages[2]).toEqual(dotsPage[0]);
  });

  it(`Pagination has only right dot button placed at last 3rd page`, () => {
    /*
      Only Right dot page is present if current page is at the begining of page. 
    */
    const totalRenderPage = 11; // includes Previous, Next and Dots pages
    const onPageChange = vi.fn();
    const { getAllByRole, getAllByTestId } = renderWithClient(
      <Pagination
        currentPage={2}
        totalPageCount={10}
        onPageChange={onPageChange}
        siblingCount={2}
      />,
    );

    const pages = getAllByRole('button');
    const dotsPage = getAllByTestId('pagination-button-dots');
    // only right dot page is present
    expect(dotsPage.length).toEqual(1);
    expect(pages[totalRenderPage - 3]).toEqual(dotsPage[0]);
  });

  it(`previous and next click work correctly`, () => {
    const UI = () => {
      const [currentPage, setCurrentPage] = useState(2);
      return (
        <Pagination
          currentPage={currentPage}
          totalPageCount={10}
          onPageChange={(page) => setCurrentPage(page)}
          siblingCount={2}
        />
      );
    };
    const { getByRole } = renderWithClient(<UI />);

    const previousButton = getByRole('button', {
      name: 'Previous',
    });
    const nextButton = getByRole('button', {
      name: 'Next',
    });

    // default page 2 is highlighted
    expect(
      getByRole('button', {
        name: /2/,
      }),
    ).toHaveClass('text-blue-600 bg-blue-100');

    fireEvent.click(nextButton);
    // now page 3 is highlighted
    expect(
      getByRole('button', {
        name: /3/,
      }),
    ).toHaveClass('text-blue-600 bg-blue-100');

    fireEvent.click(previousButton);
    // now page 2 is highlighted back
    expect(
      getByRole('button', {
        name: /2/,
      }),
    ).toHaveClass('text-blue-600 bg-blue-100');
  });

  it(`left dot should disappear on click on front pages`, () => {
    const UI = () => {
      const [currentPage, setCurrentPage] = useState(5);
      return (
        <Pagination
          currentPage={currentPage}
          totalPageCount={10}
          onPageChange={(page) => setCurrentPage(page)}
          siblingCount={2}
        />
      );
    };
    const { getAllByRole, getByRole, getAllByTestId } = renderWithClient(<UI />);
    const dotsPage = getAllByTestId('pagination-button-dots');
    const pages = getAllByRole('button');
    expect(pages[2]).toEqual(dotsPage[0]);

    // goto page 3
    const page3 = getByRole('button', {
      name: /3/,
    });
    fireEvent.click(page3);
    // expect left dot is disappeared
    expect(dotsPage[2]).not.toEqual(dotsPage[0]);
    expect(
      getByRole('button', {
        name: /2/,
      }),
    ).toBeInTheDocument();
  });

  it(`right dot should disappear on click on end pages`, () => {
    const UI = () => {
      const [currentPage, setCurrentPage] = useState(2);
      return (
        <Pagination
          currentPage={currentPage}
          totalPageCount={10}
          onPageChange={(page) => setCurrentPage(page)}
          siblingCount={2}
        />
      );
    };
    const totalRenderPage = 11;
    const { getAllByRole, getByRole, getAllByTestId } = renderWithClient(<UI />);
    const dotsPage = getAllByTestId('pagination-button-dots');
    let pages = getAllByRole('button');
    expect(pages[totalRenderPage - 3]).toEqual(dotsPage[0]);

    // goto page 3
    const page7 = getByRole('button', {
      name: /7/,
    });
    fireEvent.click(page7);
    pages = getAllByRole('button');
    // expect right dot disappear
    expect(pages[totalRenderPage - 3]).not.toEqual(dotsPage[0]);
    expect(
      getByRole('button', {
        name: /8/,
      }),
    ).toBeInTheDocument();
  });

  it('ignore previous and next click when current page is at extreme end', () => {
    const UI = () => {
      const [currentPage, setCurrentPage] = useState(1);
      return (
        <Pagination
          currentPage={currentPage}
          totalPageCount={3}
          onPageChange={(page) => setCurrentPage(page)}
          siblingCount={2}
        />
      );
    };
    const { getByRole } = renderWithClient(<UI />);

    const previousButton = getByRole('button', {
      name: 'Previous',
    });
    const nextButton = getByRole('button', {
      name: 'Next',
    });

    // default page 1 is highlighted
    expect(
      getByRole('button', {
        name: /1/,
      }),
    ).toHaveClass('text-blue-600 bg-blue-100');
    fireEvent.click(previousButton);
    // page 1 is still highlighted
    expect(
      getByRole('button', {
        name: /1/,
      }),
    ).toHaveClass('text-blue-600 bg-blue-100');

    fireEvent.click(
      getByRole('button', {
        name: /3/,
      }),
    );

    // page 3 is highlighted

    expect(
      getByRole('button', {
        name: /3/,
      }),
    ).toHaveClass('text-blue-600 bg-blue-100');

    fireEvent.click(nextButton);
    // page 3 is still highlighted
    expect(
      getByRole('button', {
        name: /3/,
      }),
    ).toHaveClass('text-blue-600 bg-blue-100');
  });
});
