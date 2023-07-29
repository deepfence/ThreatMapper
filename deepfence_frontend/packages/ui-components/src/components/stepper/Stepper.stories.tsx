import { Meta, StoryFn } from '@storybook/react';
import { IconContext } from 'react-icons';
import { HiBookOpen } from 'react-icons/hi';

import { Step, StepIndicator, StepLine, Stepper } from '@/components/stepper/Stepper';

export default {
  title: 'Components/Stepper',
  component: Stepper,
} as Meta<typeof Stepper>;

const Icon = () => (
  <IconContext.Provider
    value={{
      className: '',
      size: '24px',
    }}
  >
    <HiBookOpen />
  </IconContext.Provider>
);

const Template: StoryFn<typeof Stepper> = (args) => (
  <Stepper>
    <Step
      indicator={
        <StepIndicator>
          <Icon />
          <StepLine />
        </StepIndicator>
      }
      title="Ordered"
    >
      <div>A Laptop</div>
    </Step>
    <Step
      indicator={
        <StepIndicator>
          <span className="w-6 h-6 flex items-center justify-center">1</span>
          <StepLine />
        </StepIndicator>
      }
      title="Shipped"
    >
      <div className="dark:text-gray-400 text-sm">
        Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem
        Ipsum has been the industrys standard dummy text ever since the 1500s, when an
        unknown printer took a galley of type and scrambled it to make a type specimen
        book. It has survived not only five centuries, but also the leap into electronic
        typesetting, remaining essentially unchanged. It was popularised in the 1960s with
        the release of Letraset sheets containing Lorem Ipsum passages, and more recently
        with desktop publishing software like Aldus PageMaker including versions of Lorem
        Ipsum.
      </div>
    </Step>
    <Step
      indicator={<span className="w-6 h-6 flex items-center justify-center">2</span>}
      title="Delivered"
    >
      <div className="dark:text-gray-400 text-lg">Successfully delivered</div>
    </Step>
  </Stepper>
);
export const Default = {
  render: Template,
};
