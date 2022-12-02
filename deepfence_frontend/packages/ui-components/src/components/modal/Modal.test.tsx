import '@testing-library/jest-dom';

import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { describe, expect, it } from 'vitest';

import Button from '@/components/button/Button';
import { Modal } from '@/components/modal/Modal';
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

describe(`Component Modal`, () => {
  it(`open by default`, () => {
    const { getByText } = renderUI(<Modal defaultOpen={true}>This is a content</Modal>);
    expect(getByText('This is a content')).toBeInTheDocument();
  });

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
          <Modal
            defaultOpen={false}
            open={open}
            onOpenChange={() => setOpen(false)}
            elementToFocusOnCloseRef={ref}
          >
            This is a content
          </Modal>
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
    const closeBtnForModal = getByTestId('modal-close-button');
    expect(closeBtnForModal).toBeInTheDocument();

    await user.click(closeBtnForModal);
    expect(queryByText('This is a content')).toBeNull();

    // triggerer focus back
    const openBtnForModalAfterClose = getByTestId('button-trigger-id');
    expect(openBtnForModalAfterClose).toHaveFocus();
  });

  it(`open modal with header and footer`, async () => {
    const Footer = () => <div>Footer</div>;
    const user = userEvent.setup();
    const UI = () => {
      const [open, setOpen] = useState(false);
      const ref = useRef(null);

      return (
        <>
          <Button onClick={() => setOpen(true)} id="trigger-id" ref={ref}>
            Click to open
          </Button>
          <Modal
            defaultOpen={false}
            open={open}
            onOpenChange={() => setOpen(false)}
            elementToFocusOnCloseRef={ref}
            title="Test title"
            footer={<Footer />}
          >
            This is a content
          </Modal>
        </>
      );
    };
    const { getByTestId, queryByText, getByText } = renderUI(<UI />);
    expect(queryByText('This is a content')).toBeNull();

    const openBtnForModal = getByTestId('button-trigger-id');
    expect(openBtnForModal).toBeInTheDocument();
    await user.click(openBtnForModal);

    expect(getByText('This is a content')).toBeInTheDocument();
    expect(getByTestId('modal-title')).toHaveTextContent('Test title');
    expect(getByTestId('modal-footer')).toHaveTextContent('Footer');
  });
});
