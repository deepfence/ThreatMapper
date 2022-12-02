import { ComponentMeta, ComponentStory } from '@storybook/react';
import { useState } from 'react';
import { HiInformationCircle } from 'react-icons/hi';

import Badge, { ColorType } from '@/components/badge/Badge';
import Button from '@/components/button/Button';

export default {
  title: 'Components/Badge',
  component: Badge,
  argTypes: {
    onClick: { action: 'onClick' },
  },
} as ComponentMeta<typeof Badge>;

const Template: ComponentStory<typeof Badge> = (args) => <Badge {...args} />;

export const Default = Template.bind({});
Default.args = {
  label: 'Badge sm',
};

export const Primary = Template.bind({});
Primary.args = {
  label: 'Badge sm',
  color: 'primary',
};

export const Success = Template.bind({});
Success.args = {
  label: 'Badge sm',
  color: 'success',
};

export const Danger = Template.bind({});
Danger.args = {
  label: 'Badge sm',
  color: 'danger',
};

export const MediumDanger = Template.bind({});
MediumDanger.args = {
  label: 'Badge sm',
  color: 'danger',
  sizing: 'md',
};

export const WithCloseAction = () => {
  const dummy = [
    {
      id: 'default',
      value: 'default',
      label: 'Default',
    },
    {
      id: 'primary',
      value: 'primary',
      label: 'Primary',
    },
    {
      id: 'success',
      value: 'success',
      label: 'Success',
    },
    {
      id: 'danger',
      value: 'danger',
      label: 'Danger',
    },
  ];
  const [badges, setBadges] = useState(dummy);
  return (
    <>
      <div className="flex gap-2">
        {badges.map(({ id, label, value }, i) => (
          <Badge
            key={i}
            label={label}
            id={id}
            value={value}
            color={value as ColorType}
            sizing="md"
            icon={<HiInformationCircle />}
            isRemove={true}
            onRemove={(badge) => {
              const index = badges.findIndex((_badge) => _badge.id === badge.id);
              badges.splice(index, 1);
              setBadges([...badges]);
            }}
          />
        ))}
      </div>
      <div className="mt-5">
        <Button size="xs" outline onClick={() => setBadges(dummy)}>
          Reset remove
        </Button>
      </div>
    </>
  );
};

export const CustomColor = () => {
  const dummy = [
    {
      id: 'default',
      value: 'default',
      label: 'Default',
    },
  ];
  const [badges] = useState(dummy);
  return (
    <>
      <div className="flex gap-2">
        {badges.map(({ id, label, value }, i) => (
          <Badge
            key={i}
            label={label}
            id={id}
            value={value}
            color={value as ColorType}
            sizing="md"
            icon={<HiInformationCircle />}
            isRemove={true}
            className={'bg-lime-700 text-teal-300'}
          />
        ))}
      </div>
    </>
  );
};
