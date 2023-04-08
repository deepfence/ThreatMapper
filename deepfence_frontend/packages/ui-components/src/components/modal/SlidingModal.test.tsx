import '@testing-library/jest-dom';

import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { describe, expect, it } from 'vitest';

import Button from '@/components/button/Button';
import {
  SlidingModal,
  SlidingModalContent,
  SlidingModalFooter,
  SlidingModalHeader,
} from '@/components/modal/SlidingModal';
import { renderUI } from '@/tests/utils';

/**
 * Why user-event???
 * when you fire a click event on a button with fireEvent.click,
 * the button will not be focused. The button is not focused. But with userEvent.click(),
 * this button will be focused. useEvent can better reflect users' real behaviour
 *
 * https://stackoverflow.com/questions/64006345/react-testing-library-when-to-use-userevent-click-and-when-to-use-fireevent
 * https://testing-library.com/docs/user-event/intro/
 */

describe(`Component SlidingModal`, () => {
  it(`open modal by on click and auto focus on close`, async () => {
    const user = userEvent.setup();
    const UI = () => {
      const [open, setOpen] = useState(false);
      const ref = useRef(null);

      return (
        <>
          <Button onClick={() => setOpen(true)} id="trigger-id" ref={ref}>
            Click to open
          </Button>
          <SlidingModal
            defaultOpen={false}
            open={open}
            onOpenChange={() => setOpen(false)}
            elementToFocusOnCloseRef={ref}
          >
            <SlidingModalContent>This is a content</SlidingModalContent>
          </SlidingModal>
        </>
      );
    };
    const { getByTestId, queryByText, getByText } = renderUI(<UI />);
    expect(queryByText('This is a content')).toBeNull();

    const openBtnForModal = getByTestId('button-trigger-id');
    expect(openBtnForModal).toBeInTheDocument();
    await user.click(openBtnForModal);

    expect(getByText('This is a content')).toBeInTheDocument();

    // on close
    const overlay = getByTestId('sliding-modal-overlay');
    expect(overlay).toBeInTheDocument();

    await user.click(overlay);
    expect(queryByText('This is a content')).toBeNull();

    // triggerer focus back
    const openBtnForModalAfterClose = getByTestId('button-trigger-id');
    expect(openBtnForModalAfterClose).toHaveFocus();
  });

  it(`open sliding modal with header and footer`, async () => {
    const user = userEvent.setup();
    const UI = () => {
      const [open, setOpen] = useState(false);
      const ref = useRef(null);

      return (
        <>
          <Button onClick={() => setOpen(true)} id="trigger-id" ref={ref}>
            Click to open
          </Button>
          <SlidingModal
            defaultOpen={false}
            open={open}
            onOpenChange={() => setOpen(false)}
            elementToFocusOnCloseRef={ref}
          >
            <SlidingModalHeader>Test title</SlidingModalHeader>
            <SlidingModalContent>This is a content</SlidingModalContent>
            <SlidingModalFooter>Footer</SlidingModalFooter>
          </SlidingModal>
        </>
      );
    };
    const { getByTestId, queryByText, getByText } = renderUI(<UI />);
    expect(queryByText('This is a content')).toBeNull();

    const openBtnForModal = getByTestId('button-trigger-id');
    expect(openBtnForModal).toBeInTheDocument();
    await user.click(openBtnForModal);

    expect(getByText('This is a content')).toBeInTheDocument();
    expect(getByTestId('sliding-modal-title')).toHaveTextContent('Test title');
    expect(getByTestId('sliding-modal-footer')).toHaveTextContent('Footer');
  });
});
