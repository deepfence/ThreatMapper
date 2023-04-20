import { useEffect, useRef, useState } from 'react';
import { FiFilter } from 'react-icons/fi';
import { useSearchParams } from 'react-router-dom';
import { IconButton, Popover, Radio } from 'ui-components';

import { GraphNodeInfo } from '@/api/generated';
import {
  ThreatGraphComponent,
  ThreatGraphFilters,
} from '@/features/threat-graph/components/ThreatGraph';
import { DetailsModal } from '@/features/threat-graph/data-components/DetailsModal';
import { ThreatGraphNodeModelConfig } from '@/features/threat-graph/utils/threat-graph-custom-node';

const ThreatGraph = () => {
  const [modalData, setModalData] = useState<{
    label: string;
    nodeType: string;
    nodes?: { [key: string]: GraphNodeInfo } | null;
  }>();
  const [searchParams] = useSearchParams();

  const [filters, setFilters] = useState<ThreatGraphFilters>({
    type: searchParams.get('type') ?? 'all',
  });

  useEffect(() => {
    setFilters({
      type: searchParams.get('type') ?? 'all',
    });
  }, [searchParams]);

  return (
    <div className="h-full flex flex-col">
      <ThreatGraphHeader />
      <div className="m-2 flex-1">
        <ThreatGraphComponent
          onNodeClick={(model: ThreatGraphNodeModelConfig | undefined) => {
            if (!model) return;
            if (model.nonInteractive) return;
            const { label, nodeType, nodes } = model;
            setModalData({ label, nodeType, nodes });
          }}
          filters={filters}
        />
      </div>
      {modalData && (
        <DetailsModal
          open={!!modalData}
          onOpenChange={(open) => {
            if (!open) {
              setModalData(undefined);
            }
          }}
          nodes={modalData.nodes}
          label={modalData.label}
          nodeType={modalData.nodeType}
        />
      )}
    </div>
  );
};

const ThreatGraphHeader = () => {
  const elementToFocusOnClose = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const isFilterApplied = searchParams.get('type') && searchParams.get('type') !== 'all';
  return (
    <div className="flex p-2 w-full shadow bg-white dark:bg-gray-800 justify-between items-center">
      <span className="text-md font-medium text-gray-700 dark:text-gray-200">
        Threat Graph
      </span>
      <div className="relative gap-x-4">
        {isFilterApplied && (
          <span className="absolute -left-[2px] -top-[2px] inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
        )}
        <Popover
          triggerAsChild
          elementToFocusOnCloseRef={elementToFocusOnClose}
          content={
            <div className="dark:text-white p-4">
              <form className="flex flex-col gap-y-6">
                <fieldset>
                  <legend className="text-sm font-medium">Type</legend>
                  <div className="flex gap-x-4">
                    <Radio
                      direction="row"
                      value={searchParams.get('type') ?? 'all'}
                      onValueChange={(value) => {
                        setSearchParams((prev) => {
                          prev.set('type', value);
                          return prev;
                        });
                      }}
                      options={[
                        {
                          label: 'All',
                          value: 'all',
                        },
                        {
                          label: 'Vulnerability',
                          value: 'vulnerability',
                        },
                        {
                          label: 'Secret',
                          value: 'secret',
                        },
                        {
                          label: 'Malware',
                          value: 'malware',
                        },
                        {
                          label: 'Compliance',
                          value: 'compliance',
                        },
                        {
                          label: 'Cloud Compliance',
                          value: 'cloud_compliance',
                        },
                      ]}
                    />
                  </div>
                </fieldset>
              </form>
            </div>
          }
        >
          <IconButton
            className="ml-auto rounded-lg"
            size="xxs"
            outline
            color="primary"
            ref={elementToFocusOnClose}
            icon={<FiFilter />}
          />
        </Popover>
      </div>
    </div>
  );
};

export const module = {
  element: <ThreatGraph />,
};
