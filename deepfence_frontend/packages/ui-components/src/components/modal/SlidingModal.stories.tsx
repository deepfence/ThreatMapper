import { ComponentMeta } from '@storybook/react';
import { useRef, useState } from 'react';

import Button from '@/components/button/Button';
import SlidingModal from '@/components/modal/SlidingModal';

export default {
  title: 'Components/SlidingModal',
  component: SlidingModal,
  argTypes: {
    onOpenChange: { action: 'onOpenChange' },
  },
} as ComponentMeta<typeof SlidingModal>;

export const ModalWithTrigger = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  return (
    <>
      <Button color="primary" onClick={() => setOpen(true)} ref={ref}>
        Click to open
      </Button>
      <SlidingModal
        title="Modal Title"
        open={open}
        onOpenChange={() => setOpen(false)}
        elementToFocusOnCloseRef={ref}
      >
        <div className="dark:text-white">This is a content</div>
      </SlidingModal>
    </>
  );
};

export const TriggerFromLeft = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  return (
    <>
      <Button color="primary" onClick={() => setOpen(true)} ref={ref}>
        Click to open
      </Button>
      <SlidingModal
        title="Modal Title"
        open={open}
        onOpenChange={() => setOpen(false)}
        elementToFocusOnCloseRef={ref}
        direction="left"
      >
        <div className="dark:text-white">This is a content</div>
      </SlidingModal>
    </>
  );
};

export const WithoutTitle = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  return (
    <>
      <Button color="primary" onClick={() => setOpen(true)} ref={ref}>
        Click to open
      </Button>
      <SlidingModal
        open={open}
        onOpenChange={() => setOpen(false)}
        elementToFocusOnCloseRef={ref}
      >
        <div className="dark:text-white">This is a content</div>
      </SlidingModal>
    </>
  );
};

const Footer = () => <div>Footer</div>;

export const LongContent = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button color="primary" onClick={() => setOpen(true)}>
        Click to open
      </Button>
      <SlidingModal
        title="Modal Title"
        open={open}
        onOpenChange={() => setOpen(false)}
        footer={<Footer />}
      >
        <div className="dark:text-white">
          {Array.from(Array(30).keys()).map((k) => (
            <p key={k}>This is a content</p>
          ))}
        </div>
      </SlidingModal>
    </>
  );
};
