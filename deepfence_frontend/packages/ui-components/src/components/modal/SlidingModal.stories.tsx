import { Meta, StoryFn } from '@storybook/react';
import { useRef, useState } from 'react';

import Button from '@/components/button/Button';
import SlidingModal, {
  SlidingModalCloseButton,
  SlidingModalContent,
  SlidingModalFooter,
  SlidingModalHeader,
} from '@/components/modal/SlidingModal';

export default {
  title: 'Components/SlidingModal',
  component: SlidingModal,
  argTypes: {
    onOpenChange: { action: 'onOpenChange' },
  },
} satisfies Meta<typeof SlidingModal>;

export const ModalWithTrigger: StoryFn<typeof SlidingModal> = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  return (
    <>
      <Button color="default" onClick={() => setOpen(true)} ref={ref}>
        Click to open
      </Button>
      <SlidingModal
        open={open}
        onOpenChange={() => setOpen(false)}
        elementToFocusOnCloseRef={ref}
        size="xl"
      >
        <SlidingModalCloseButton />
        <SlidingModalHeader>
          <div>Modal Header</div>
        </SlidingModalHeader>
        <SlidingModalContent>
          <div className="dark:text-white">This is a content</div>
        </SlidingModalContent>
      </SlidingModal>
    </>
  );
};

export const TriggerFromLeft: StoryFn<typeof SlidingModal> = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  return (
    <>
      <Button color="default" onClick={() => setOpen(true)} ref={ref}>
        Click to open
      </Button>
      <SlidingModal
        open={open}
        onOpenChange={() => setOpen(false)}
        elementToFocusOnCloseRef={ref}
        direction="left"
      >
        <SlidingModalCloseButton />

        <SlidingModalHeader>
          <div>Modal Title</div>
        </SlidingModalHeader>
        <SlidingModalContent>
          <div className="dark:text-white">This is a content</div>
        </SlidingModalContent>
        <SlidingModalFooter>
          <div>Modal Footer</div>
        </SlidingModalFooter>
      </SlidingModal>
    </>
  );
};

export const WithoutTitle: StoryFn<typeof SlidingModal> = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  return (
    <>
      <Button color="default" onClick={() => setOpen(true)} ref={ref}>
        Click to open
      </Button>
      <SlidingModal
        open={open}
        onOpenChange={() => setOpen(false)}
        elementToFocusOnCloseRef={ref}
      >
        <SlidingModalContent>
          <div className="dark:text-white">This is a content</div>
        </SlidingModalContent>
      </SlidingModal>
    </>
  );
};

export const LongContent: StoryFn<typeof SlidingModal> = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button color="default" onClick={() => setOpen(true)}>
        Click to open
      </Button>
      <SlidingModal open={open} onOpenChange={() => setOpen(false)}>
        <SlidingModalCloseButton />
        <SlidingModalHeader>Modal Title</SlidingModalHeader>
        <SlidingModalContent>
          {Array.from(Array(300).keys()).map((k) => (
            <p key={k}>This is a content</p>
          ))}
        </SlidingModalContent>
        <SlidingModalFooter>Modal Footer</SlidingModalFooter>
      </SlidingModal>
    </>
  );
};
