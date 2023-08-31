import { Meta, StoryFn } from '@storybook/react';
import { useRef, useState } from 'react';

import Button from '@/components/button/Button';
import Modal from '@/components/modal/Modal';

export default {
  title: 'Components/Modal',
  component: Modal,
  argTypes: {
    onOpenChange: { action: 'onOpenChange' },
  },
} satisfies Meta<typeof Modal>;

export const DefaultOpenModalS: StoryFn<typeof Modal> = () => {
  const [, setOpen] = useState(false);
  return (
    <Modal defaultOpen={true} onOpenChange={() => setOpen(false)} size="s">
      This is a small modal
    </Modal>
  );
};
export const DefaultOpenModalM: StoryFn<typeof Modal> = () => {
  const [, setOpen] = useState(false);
  return (
    <Modal defaultOpen={true} onOpenChange={() => setOpen(false)} size="m">
      This is a medium modal
    </Modal>
  );
};
export const DefaultOpenModalL: StoryFn<typeof Modal> = () => {
  const [, setOpen] = useState(false);
  return (
    <Modal defaultOpen={true} onOpenChange={() => setOpen(false)} size="l">
      This is a large modal
    </Modal>
  );
};
export const DefaultOpenModalXL: StoryFn<typeof Modal> = () => {
  const [, setOpen] = useState(false);
  return (
    <Modal defaultOpen={true} onOpenChange={() => setOpen(false)} size="xl">
      This is a xtra large modal
    </Modal>
  );
};
export const DefaultOpenModalXXL: StoryFn<typeof Modal> = () => {
  const [, setOpen] = useState(false);
  return (
    <Modal defaultOpen={true} onOpenChange={() => setOpen(false)} size="xxl">
      This is a extra-extra large modal
    </Modal>
  );
};

export const ModalWithTrigger: StoryFn<typeof Modal> = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  return (
    <>
      <Button color="default" onClick={() => setOpen(true)} ref={ref}>
        Click to open
      </Button>
      <Modal
        title="Modal Title"
        footer={
          <div className={'flex gap-x-4 justify-end'}>
            <Button variant="outline">cancel</Button>
            <Button>confirm</Button>
          </div>
        }
        open={open}
        onOpenChange={() => setOpen(false)}
        elementToFocusOnCloseRef={ref}
      >
        <div>
          Message: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
          tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
          quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
          consequat. Duis velit esse cillum dolore?
        </div>
      </Modal>
    </>
  );
};

export const WithoutTitleWithFooter: StoryFn<typeof Modal> = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  return (
    <>
      <Button color="default" onClick={() => setOpen(true)} ref={ref}>
        Click to open
      </Button>
      <div className="h-[100px] dark:text-text-input-value">
        Some text here to check overlay
      </div>
      <Modal
        footer={
          <div className={'flex gap-x-4 justify-end'}>
            <Button>ok</Button>
          </div>
        }
        open={open}
        onOpenChange={() => setOpen(false)}
        elementToFocusOnCloseRef={ref}
      >
        <div>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do do do eiusmod
          tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
          quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
          consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
          dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
          proident...
        </div>
      </Modal>
    </>
  );
};

export const WithoutFooter: StoryFn<typeof Modal> = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button color="default" onClick={() => setOpen(true)}>
        Click to open
      </Button>
      <Modal title="Modal Title" open={open} onOpenChange={() => setOpen(false)}>
        <div>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do do do eiusmod
          tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
          quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
          consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
          dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident,
          sunt in...
        </div>
      </Modal>
    </>
  );
};

export const WithoutHeaderFooter: StoryFn<typeof Modal> = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button color="default" onClick={() => setOpen(true)}>
        Click to open
      </Button>
      <Modal open={open} onOpenChange={() => setOpen(false)}>
        <div>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do do do eiusmod
          tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
          quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
          consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
          dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident,
          sunt in...
        </div>
      </Modal>
    </>
  );
};

export const LongContent: StoryFn<typeof Modal> = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button color="default" onClick={() => setOpen(true)}>
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
