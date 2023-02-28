import { useRef, useState } from 'react';
import { IconContext } from 'react-icons';
import { FaHistory, FaPlus } from 'react-icons/fa';
import { FiFilter } from 'react-icons/fi';
import { useParams } from 'react-router-dom';
import { Button, Card, SlidingModal } from 'ui-components';

import { GoBack } from '@/components/GoBack';
import { AddRegistry } from '@/features/registries/components/registry-accounts/AddRegistry';
import { RegistryAccountTable } from '@/features/registries/components/registry-accounts/RegistryAccountTable';
import { formatMilliseconds } from '@/utils/date';

type ScanResult = {
  id: string;
  package: string;
  severity: string;
  description: string;
  link: string;
  action?: null;
};

export type LoaderDataType = {
  error?: string;
  message?: string;
  data?: ScanResult[];
};

const HeaderComponent = ({
  scanId,
  nodeType,
  timestamp,
  elementToFocusOnClose,
  setShowFilter,
}: {
  scanId: string;
  nodeType: string;
  timestamp: number;
  elementToFocusOnClose: React.MutableRefObject<null>;
  setShowFilter: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <div className="flex p-2 pl-2 w-full items-center shadow bg-white dark:bg-gray-800">
      <GoBack />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
        {nodeType.toUpperCase()} / REGISTRY ACCOUNTS
      </span>
      <div className="ml-auto flex items-center gap-x-4">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 dark:text-gray-200">
            {formatMilliseconds(timestamp)}
          </span>
          <span className="text-gray-400 text-[10px]">Last refreshed</span>
        </div>
        <Button
          className="ml-auto bg-blue-100 dark:bg-blue-500/10"
          size="xs"
          color="normal"
          onClick={() => {
            setShowFilter(true);
          }}
        >
          <IconContext.Provider
            value={{
              className: 'w-4 h-4',
            }}
          >
            <FaHistory />
          </IconContext.Provider>
        </Button>

        <div className="relative">
          <span className="absolute left-0 top-0 inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
          <Button
            className="ml-auto bg-blue-100 dark:bg-blue-500/10"
            size="xs"
            color="normal"
            ref={elementToFocusOnClose}
            onClick={() => {
              setShowFilter(true);
            }}
          >
            <IconContext.Provider
              value={{
                className: 'w-4 h-4',
              }}
            >
              <FiFilter />
            </IconContext.Provider>
          </Button>
        </div>
      </div>
    </div>
  );
};

export const RegistryAccount = () => {
  const params = useParams() as {
    type: string;
  };
  const elementToFocusOnClose = useRef(null);
  const [showFilter, setShowFilter] = useState(false);

  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  return (
    <>
      {/* <ScanResultFilterModal
        showFilter={showFilter}
        setShowFilter={setShowFilter}
        elementToFocusOnClose={elementToFocusOnClose.current}
      /> */}
      <HeaderComponent
        scanId={'jljl'}
        nodeType={params.type}
        elementToFocusOnClose={elementToFocusOnClose}
        setShowFilter={setShowFilter}
        timestamp={0}
      />
      <div className="grid p-2 gap-x-2">
        {/* <div className="self-start grid gap-y-2"> */}
        {/* <SeverityCountComponent
            theme={mode}
            data={{
              total: location.state.severityCounts.total,
              severityCounts: {
                critical: location.state.severityCounts.critical,
                medium: location.state.severityCounts.medium,
                high: location.state.severityCounts.high,
                low: location.state.severityCounts.low,
              },
            }}
          /> */}
        {/* </div> */}
        <div className="self-start grid gap-y-2">
          <Card className="w-auto h-12 flex p-4 pt-8 pb-8">
            <div className="flex">
              <div className="pr-6 gap-x-2 flex flex-col justify-center">
                <div className="pr-4 flex items-center gap-x-2">
                  <span className="text-lg text-gray-900 dark:text-gray-200 font-semibold">
                    2
                  </span>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Registries
                </span>
              </div>
              <div className="pr-6 gap-x-2 flex flex-col justify-center">
                <div className="pr-4 flex items-center gap-x-2">
                  <span className="text-lg text-gray-900 dark:text-gray-200 font-semibold">
                    25
                  </span>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Total Images
                </span>
              </div>
              <div className="pr-6 gap-x-2 flex flex-col justify-center">
                <div className="pr-4 flex items-center gap-x-2">
                  <span className="text-lg text-gray-900 dark:text-gray-200 font-semibold">
                    0
                  </span>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">Scanned</span>
              </div>
              <div className="pr-6 gap-x-2 flex flex-col justify-center">
                <div className="pr-4 flex items-center gap-x-2">
                  <span className="text-lg text-gray-900 dark:text-gray-200 font-semibold">
                    0
                  </span>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  In Progress
                </span>
              </div>
            </div>
            {/* add button on right side */}
            <div className="ml-auto flex items-center gap-x-4">
              <Button
                color="primary"
                size="xs"
                startIcon={<FaPlus />}
                onClick={() => setOpen(true)}
                ref={ref}
              >
                Add Registry
              </Button>
              <SlidingModal
                width="w-2/6"
                header="Add Registry"
                open={open}
                onOpenChange={() => setOpen(false)}
                elementToFocusOnCloseRef={ref}
              >
                <AddRegistry />
              </SlidingModal>
            </div>
          </Card>
          <RegistryAccountTable />
        </div>
      </div>
    </>
  );
};
