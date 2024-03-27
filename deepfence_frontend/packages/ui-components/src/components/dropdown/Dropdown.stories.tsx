import { Meta, StoryFn, StoryObj } from '@storybook/react';
import { useState } from 'react';

import Button from '@/components/button/Button';
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  DropdownSubMenu,
} from '@/components/dropdown/Dropdown';
import { PlusIcon } from '@/components/icons/Plus';

const Plus = () => (
  <span className="h-4 w-4">
    <PlusIcon />
  </span>
);

export default {
  title: 'Components/Dropdown',
  component: Dropdown,
  argTypes: {
    align: {
      defaultValue: undefined,
      options: [undefined, 'start', 'center', 'end'],
      control: { type: 'radio' },
    },
  },
} satisfies Meta<typeof Dropdown>;

const DefaultTemplate: StoryFn<typeof Dropdown> = (args) => {
  return (
    <Dropdown
      {...args}
      content={
        <>
          <DropdownItem>First Action</DropdownItem>
          <DropdownItem>Second Action</DropdownItem>
          <DropdownItem>Third Action</DropdownItem>
          <DropdownItem>Fourth Action</DropdownItem>
          <DropdownSeparator />
          <DropdownItem color="error" disabled>
            Sign Out
          </DropdownItem>
        </>
      }
    >
      <Button color="default" endIcon={<Plus />} size="sm">
        Click me
      </Button>
    </Dropdown>
  );
};

export const Default: StoryObj<typeof Dropdown> = {
  render: DefaultTemplate,

  args: {
    triggerAsChild: true,
  },
};

const TemplateForIcons: StoryFn<typeof Dropdown> = (args) => {
  return (
    <Dropdown
      {...args}
      content={
        <>
          <DropdownItem disabled>
            <Plus />
            <span>First Action</span>
          </DropdownItem>
          <DropdownItem>
            <Plus />
            <span>Second Action</span>
          </DropdownItem>
          <DropdownItem>
            <Plus />
            <span>Third Action</span>
          </DropdownItem>
          <DropdownItem icon={<Plus />}>
            <span>Fourth Action</span>
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem className="text-red-500 dark:text-red-500">
            <Plus />
            <span>Sign Out</span>
          </DropdownItem>
        </>
      }
    >
      <Button color="default">Click me</Button>
    </Dropdown>
  );
};

export const WithIcons: StoryObj<typeof Dropdown> = {
  render: TemplateForIcons,

  args: {
    triggerAsChild: true,
  },
};

const ControlledTemplate: StoryFn<typeof Dropdown> = (args) => {
  const [open, setOpen] = useState(false);
  return (
    <Dropdown
      {...args}
      open={open}
      loop
      onOpenChange={(open) => {
        setOpen(open);
      }}
      content={
        <>
          <DropdownItem selected>First Action</DropdownItem>
          <DropdownItem>Second Action</DropdownItem>
          <DropdownItem>Third Action</DropdownItem>
          <DropdownItem>Fourth Action</DropdownItem>
          <DropdownSubMenu
            triggerAsChild
            content={
              <>
                <DropdownItem disabled>Mask this</DropdownItem>
                <DropdownItem>Mask across</DropdownItem>
              </>
            }
          >
            More
          </DropdownSubMenu>
          <DropdownSeparator />
          <DropdownItem className="text-red-500 dark:text-red-500">Sign Out</DropdownItem>
        </>
      }
    >
      <Button color="default">Click me</Button>
    </Dropdown>
  );
};

export const Controlled: StoryObj<typeof Dropdown> = {
  render: ControlledTemplate,

  args: {
    triggerAsChild: true,
  },
};
