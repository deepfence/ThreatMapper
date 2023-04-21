import { Meta } from '@storybook/react';
import { useRef, useState } from 'react';

import Button from '@/components/button/Button';
import Modal from '@/components/modal/Modal';

export default {
  title: 'Components/Modal',
  component: Modal,
  argTypes: {
    onOpenChange: { action: 'onOpenChange' },
  },
} as Meta<typeof Modal>;

export const DefaultOpenModal = () => {
  const [, setOpen] = useState(false);
  return (
    <Modal defaultOpen={true} onOpenChange={() => setOpen(false)}>
      This is a content
    </Modal>
  );
};

export const ModalWithTrigger = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  return (
    <>
      <Button color="primary" onClick={() => setOpen(true)} ref={ref}>
        Click to open
      </Button>
      <Modal
        title="Modal Title"
        footer={<div className={''}>This is Footer</div>}
        open={open}
        onOpenChange={() => setOpen(false)}
        elementToFocusOnCloseRef={ref}
      >
        <div className="dark:text-white">This is a content</div>
      </Modal>
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
      <Modal
        footer={<div className={''}>This is Footer</div>}
        open={open}
        onOpenChange={() => setOpen(false)}
        elementToFocusOnCloseRef={ref}
      >
        <div className="dark:text-white">This is a content</div>
      </Modal>
    </>
  );
};

export const WithoutFooter = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button color="primary" onClick={() => setOpen(true)}>
        Click to open
      </Button>
      <Modal title="Modal Title" open={open} onOpenChange={() => setOpen(false)}>
        <div className="dark:text-white">This is a content</div>
      </Modal>
    </>
  );
};

export const JustContentWithTrigger = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button color="primary" onClick={() => setOpen(true)}>
        Click to open
      </Button>
      <Modal open={open} onOpenChange={() => setOpen(false)}>
        <div className="dark:text-white">This is a content</div>
      </Modal>
    </>
  );
};
export const LongContent = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button color="primary" onClick={() => setOpen(true)}>
        Click to open
      </Button>
      <Modal
        title="Modal Title"
        open={open}
        footer={<div className={''}>This is Footer</div>}
        onOpenChange={() => setOpen(false)}
      >
        <div className="dark:text-white">
          {Array.from(Array(20).keys()).map((k) => (
            <p key={k}>This is a content</p>
          ))}
        </div>
      </Modal>
    </>
  );
};

export const FullWidth = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button color="primary" onClick={() => setOpen(true)}>
        Click to open
      </Button>
      <Modal
        title="Modal Title"
        open={open}
        footer={<div className={''}>This is Footer</div>}
        onOpenChange={() => setOpen(false)}
        width="w-full"
      >
        <div className="dark:text-white">
          {Array.from(Array(10).keys()).map((k) => (
            <p className="text-center" key={k}>
              It is a long established fact that a reader will be distracted by the
              readable content of a page when looking at its layout
            </p>
          ))}
        </div>
      </Modal>
    </>
  );
};
