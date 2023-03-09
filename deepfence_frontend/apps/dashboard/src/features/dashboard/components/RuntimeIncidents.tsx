import { IconContext } from 'react-icons';
import { HiArrowRight, HiFlag } from 'react-icons/hi';
import { Button, Card, Separator } from 'ui-components';

import PlacehoderRuntimeIncidents from '@/assets/placeholder-runtime-incidents.svg';
import { DFLink } from '@/components/DFLink';

export const RuntimeIncidents = () => {
  return (
    <Card className="p-2">
      <div className="flex flex-row items-center gap-x-2 pb-2">
        <IconContext.Provider
          value={{
            className: 'w-4 h-4 text-blue-700',
          }}
        >
          <HiFlag />
        </IconContext.Provider>
        <h4 className="text-base font-medium">Runtime Incidents</h4>
        <div className="flex ml-auto">
          <Button color="normal" size="xs" disabled>
            &nbsp;
          </Button>
        </div>
      </div>
      <Separator />
      <div className="mt-2 px-2 grid place-items-center">
        <img
          src={PlacehoderRuntimeIncidents}
          alt="Runtime Incidents"
          width={140}
          height={140}
        />
        <p className="text-sm font-semibold">
          Upgrade to{' '}
          <span className="text-base font-bold tracking-wide">ThreatStryker</span> to get
          runtime information.
        </p>
        <p>
          <DFLink to="https://deepfence.io/threatstryker/">More information...</DFLink>
        </p>
        <div className="py-3">
          <Button
            color="success"
            size="md"
            className="bg-green-500 dark:bg-green-500 hover:bg-green-600 hover:dark:bg-green-600"
          >
            Grab ThreatStryker&nbsp;
            <HiArrowRight />
          </Button>
        </div>
      </div>
    </Card>
  );
};
