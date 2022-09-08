import { ComponentMeta } from '@storybook/react';

import Button from '../button/Button';
import Modal from './Modal';

export default {
  title: 'Components/Modal',
  component: Modal,
  argTypes: {
    onChange: { action: 'onChange' },
  },
} as ComponentMeta<typeof Modal>;

export const DefaultOpenModal = () => {
  return <Modal defaultOpen={true}>This is a content</Modal>;
};

export const ModalWithTrigger = () => {
  return (
    <Modal
      triggerElement={<Button color="primary">Open Modal</Button>}
      title="Modal Title"
      footer={<div className={''}>This is Footer</div>}
    >
      <div className="dark:text-white">This is a content</div>
    </Modal>
  );
};

export const WithoutTitle = () => {
  return (
    <Modal
      triggerElement={<Button color="primary">Open Modal</Button>}
      footer={<div className={''}>This is Footer</div>}
    >
      <div className="dark:text-white">This is a content</div>
    </Modal>
  );
};

export const WithoutFooter = () => {
  return (
    <Modal
      triggerElement={<Button color="primary">Open Modal</Button>}
      title="Modal Title"
    >
      <div className="dark:text-white">This is a content</div>
    </Modal>
  );
};

export const JustContentWithTrigger = () => {
  return (
    <Modal triggerElement={<Button color="primary">Open Modal</Button>}>
      <div className="dark:text-white">This is a content</div>
    </Modal>
  );
};
export const LongContent = () => {
  return (
    <Modal
      triggerElement={<Button color="primary">Open Modal</Button>}
      title="Modal Title"
      footer={<div className={''}>This is Footer</div>}
    >
      <div className="dark:text-white">This is a content</div>
    </Modal>
  );
};
