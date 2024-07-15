import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Badge,
  Button,
  CircleSpinner,
  SlidingModal,
  SlidingModalCloseButton,
  SlidingModalContent,
  SlidingModalHeader,
} from 'ui-components';

import {
  ModelCloudCompliance,
  ModelCloudNodeAccountsListReqCloudProviderEnum,
} from '@/api/generated';
import { CopyButton, useCopyToClipboardState } from '@/components/CopyToClipboard';
import { CopyLineIcon } from '@/components/icons/common/CopyLine';
import { RemediationBlock } from '@/components/remediation/RemediationBlock';
import { RemediationButton } from '@/components/remediation/RemediationButton';
import { PostureStatusBadge } from '@/components/SeverityBadge';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { TruncatedText } from '@/components/TruncatedText';
import { queries } from '@/queries';
import { PostureSeverityType } from '@/types/common';
import { formatMilliseconds } from '@/utils/date';
import { getFieldsKeyValue } from '@/utils/detailsPanel';
import { replacebyUppercaseCharacters } from '@/utils/label';
import { usePageNavigation } from '@/utils/usePageNavigation';

function useGetComplianceDetails() {
  const { complianceId } = useParams();
  return useSuspenseQuery({
    ...queries.lookup.cloudCompliances({
      cloudComplianceIds: [complianceId ?? ''],
    }),
  });
}

function useGetControlDetails({ controlId }: { controlId?: string }) {
  return useSuspenseQuery({
    ...queries.lookup.complianceControl({
      nodeIds: [controlId ?? ''],
    }),
    enabled: !!controlId,
  });
}
const timeFormatKey = {
  updated_at: 'updated_at',
};

const Header = ({
  setIsRemediationOpen,
  data,
  benchmarks,
}: {
  setIsRemediationOpen: React.Dispatch<React.SetStateAction<boolean>>;
  data?: ModelCloudCompliance;
  benchmarks: string[];
}) => {
  const { copy, isCopied } = useCopyToClipboardState();

  return (
    <SlidingModalHeader>
      <div className="pt-5 px-5 dark:bg-[linear-gradient(to_bottom,_#15253e_96px,_transparent_0)] bg-[linear-gradient(to_bottom,_#f6f7f9_96px,_transparent_0)]">
        <div className="flex items-center gap-2 text-text-text-and-icon pr-8">
          <div className="h-4 w-4 shrink-0">
            <PostureIcon />
          </div>
          <h3 className="text-h3 grow-0 overflow-hidden">
            <TruncatedText text={data?.title ?? '-'} />
          </h3>
          <RemediationButton
            className="ml-auto"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setIsRemediationOpen((prevOpen) => !prevOpen);
            }}
          />
        </div>
        <div className="py-[18px] flex justify-between">
          <div className="flex gap-4 items-center">
            <div className="ml-[10px]">
              <PostureStatusBadge
                className="w-full max-w-none"
                status={data?.status as PostureSeverityType}
              />
            </div>
            <div className="flex gap-2">
              {benchmarks.map((benchmarkType) => {
                return (
                  <Badge
                    label={benchmarkType.replaceAll('_', ' ').toUpperCase()}
                    key={benchmarkType}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="flat"
              size="sm"
              className="ml-auto"
              onClick={() => {
                copy(JSON.stringify(data ?? {}));
              }}
              startIcon={<CopyLineIcon />}
            >
              {isCopied ? 'Copied JSON' : 'Copy JSON'}
            </Button>
          </div>
        </div>
      </div>
    </SlidingModalHeader>
  );
};

function processLabel(labelKey: string) {
  return replacebyUppercaseCharacters(labelKey);
}

const DetailsComponent = ({
  isRemediationOpen,
  setIsRemediationOpen,
  cloudPosture,
}: {
  isRemediationOpen: boolean;
  setIsRemediationOpen: React.Dispatch<React.SetStateAction<boolean>>;
  cloudPosture?: ModelCloudCompliance & {
    benchmark_control_categories: Array<string>;
  };
}) => {
  if (!cloudPosture) {
    return (
      <div className="flex items-center p-4 justify-center">
        <h3 className="text-p1a">No details found</h3>
      </div>
    );
  }

  if (isRemediationOpen) {
    return (
      <Suspense
        fallback={
          <div className="h-full w-full flex items-center justify-center">
            <CircleSpinner size="lg" />
          </div>
        }
      >
        <RemediationBlock
          meta={{
            type: 'postureCloud',
            args: {
              cloud_provider: cloudPosture.cloud_provider,
              compliance_check_type: cloudPosture.compliance_check_type,
              query_type: 'remediation',
              title: cloudPosture.title,
              group: cloudPosture.group,
              service: cloudPosture.service,
            },
          }}
          onBackButtonClick={() => {
            setIsRemediationOpen(false);
          }}
        />
      </Suspense>
    );
  }

  type DynamicKeyType = 'subscription_id' | 'project_id';
  function getHiddenFields(
    cloud: string,
  ): Array<DynamicKeyType | keyof ModelCloudCompliance> {
    if (cloud === ModelCloudNodeAccountsListReqCloudProviderEnum.Azure) {
      return ['account_id', 'project_id'];
    } else if (cloud === ModelCloudNodeAccountsListReqCloudProviderEnum.Gcp) {
      return ['account_id', 'subscription_id'];
    } else if (cloud === ModelCloudNodeAccountsListReqCloudProviderEnum.Aws) {
      return ['subscription_id', 'project_id'];
    }
    return [];
  }

  function getPriorityField(cloud: string) {
    if (cloud === ModelCloudNodeAccountsListReqCloudProviderEnum.Azure) {
      return 'subscription_id';
    } else if (cloud === ModelCloudNodeAccountsListReqCloudProviderEnum.Gcp) {
      return 'project_id';
    }
    return 'account_id';
  }

  const keyValues = getFieldsKeyValue(
    {
      ...(cloudPosture ?? {}),
      subscription_id: cloudPosture.account_id,
      project_id: cloudPosture.account_id,
    },
    {
      hiddenFields: [
        'status',
        'description',
        'node_name',
        'severity',
        'type',
        'count',
        'node_id',
        'resources',
        'compliance_check_type',
        ...getHiddenFields(cloudPosture.cloud_provider),
      ],
      priorityFields: [
        'cloud_provider',
        'region',
        getPriorityField(cloudPosture.cloud_provider),
        'control_id',
        'title',
        'service',
        'reason',
        'resource',
        'benchmark_control_categories',
        'group',
        'masked',
        'updated_at',
      ],
    },
  );

  return (
    <div className="flex flex-wrap gap-y-[30px] gap-x-[14px] py-[18px] px-5">
      <div
        className="text-sm leading-5 text-text-text-and-icon max-h-64 overflow-y-auto"
        style={{
          wordBreak: 'break-word',
        }}
      >
        {cloudPosture?.description ?? '-'}
      </div>
      {keyValues.map(({ key, value }) => {
        const label = processLabel(key);
        let valueAsStr = '-';
        if (Array.isArray(value)) {
          valueAsStr = value.join(', ');
        } else if (typeof value === 'string') {
          valueAsStr = value;
        } else {
          valueAsStr = String(value);
        }
        return (
          <div
            key={key}
            className="flex flex-col grow basis-[45%] max-w-full gap-1 group"
          >
            <div className="flex relative">
              <div className="text-p3 text-text-text-and-icon first-letter:capitalize">
                {label}
              </div>
              <CopyButton value={valueAsStr} className="hidden group-hover:block" />
            </div>
            <div className="text-p1 dark:text-text-input-value text-text-text-and-icon break-words">
              {key in timeFormatKey ? formatMilliseconds(+valueAsStr) : valueAsStr}
            </div>
          </div>
        );
      })}
      {cloudPosture.resources?.length ? (
        <div className="flex flex-col grow basis-[100%] max-w-full gap-1 group">
          <div className="basis-[45%] flex relative">
            <div className="text-p3 text-text-text-and-icon">Resources</div>
            <CopyButton
              value={JSON.stringify(cloudPosture.resources)}
              className="hidden group-hover:block"
            />
          </div>
          <div className="text-p1 flex flex-col">
            {cloudPosture.resources.map((resource) => {
              return (
                <div
                  key={resource.node_id}
                  className="text-p1 dark:text-text-input-value text-text-text-and-icon break-words"
                >
                  {resource.name}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const Content = () => {
  const [isRemediationOpen, setIsRemediationOpen] = useState(false);

  const {
    data: { data: cloudPostures },
  } = useGetComplianceDetails();
  const data = cloudPostures.length ? cloudPostures[0] : undefined;

  // TODO: extract this cloud check to something like isAws or isCloudOfType('aws')
  let prefix = '';
  if (data?.cloud_provider?.toLowerCase().includes('aws')) {
    prefix = 'aws_compliance.';
  } else if (data?.cloud_provider?.toLowerCase().includes('gcp')) {
    prefix = 'gcp_compliance.';
  } else if (data?.cloud_provider?.toLowerCase().includes('azure')) {
    prefix = 'azure_compliance.';
  }

  const { data: controlData } = useGetControlDetails({
    controlId: data?.control_id ? `${prefix}${data.control_id}` : undefined,
  });

  const { benchmarks, categoryHierarchies } = useMemo(() => {
    if (!controlData || !controlData.data.length) {
      return { benchmarks: [], categoryHierarchies: [] };
    }
    const benchmarksSet = new Set<string>();
    const hierarchiesSet = new Set<string>();
    controlData.data.forEach((control) => {
      if (control.compliance_type) {
        benchmarksSet.add(control.compliance_type);
      }
      if (control.category_hierarchy_short) {
        hierarchiesSet.add(control.category_hierarchy_short);
      }
    });
    return {
      benchmarks: Array.from(benchmarksSet),
      categoryHierarchies: Array.from(hierarchiesSet),
    };
  }, [controlData]);

  return (
    <>
      <Header
        setIsRemediationOpen={setIsRemediationOpen}
        data={data}
        benchmarks={benchmarks}
      />
      <SlidingModalContent>
        <div className="h-full">
          <DetailsComponent
            isRemediationOpen={isRemediationOpen}
            setIsRemediationOpen={setIsRemediationOpen}
            cloudPosture={
              data
                ? {
                    ...data,
                    benchmark_control_categories: categoryHierarchies,
                  }
                : undefined
            }
          />
        </div>
      </SlidingModalContent>
    </>
  );
};

const PostureCloudDetailModal = () => {
  const { navigate } = usePageNavigation();
  const [searchParams] = useSearchParams();

  return (
    <SlidingModal
      open={true}
      onOpenChange={() => {
        navigate(`..?${searchParams.toString()}`);
      }}
      size="xl"
    >
      <SlidingModalCloseButton />
      <Suspense
        fallback={
          <SlidingModalContent>
            <div className="h-full w-full flex items-center justify-center">
              <CircleSpinner size="lg" />
            </div>
          </SlidingModalContent>
        }
      >
        <Content />
      </Suspense>
    </SlidingModal>
  );
};

export const module = {
  element: <PostureCloudDetailModal />,
};
