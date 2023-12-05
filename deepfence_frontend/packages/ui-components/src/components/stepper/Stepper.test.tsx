import '@testing-library/jest-dom';

import { describe, expect, it } from 'vitest';

import { PlusIcon } from '@/components/icons/Plus';
import { Step, StepIndicator, StepLine, Stepper } from '@/components/stepper/Stepper';
import { renderUI, screen } from '@/tests/utils';

const Plus = () => (
  <span className="h-4 w-4 block">
    <PlusIcon />
  </span>
);

describe(`Component Stepper`, () => {
  it(`render stepper`, () => {
    renderUI(
      <Stepper>
        <Step
          data-testid="step1Id"
          indicator={
            <StepIndicator>
              <Plus />
              <StepLine />
            </StepIndicator>
          }
          title="this is step 1"
        >
          <div>Step 1</div>
        </Step>
        <Step
          indicator={
            <StepIndicator>
              <span className="w-6 h-6 flex items-center justify-center">1</span>
              <StepLine />
            </StepIndicator>
          }
          title="this is step 2"
        >
          <div className="dark:text-gray-400 text-sm">Step 2</div>
        </Step>
        <Step
          indicator={<span className="w-6 h-6 flex items-center justify-center">2</span>}
          title="this is step 3"
        >
          <div className="dark:text-gray-400 text-lg">Done</div>
        </Step>
      </Stepper>,
    );
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByTestId('step1Id')).toHaveTextContent('Step 1');
  });
});
