import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Button,
  CircleSpinner,
  IconButton,
  SlidingModal,
  SlidingModalCloseButton,
  SlidingModalContent,
  SlidingModalHeader,
} from 'ui-components';

import { useCopyToClipboardState } from '@/components/CopyToClipboard';
import { CheckIcon } from '@/components/icons/common/Check';
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
const timeFormatKey = {
  updated_at: 'updated_at',
};

const Header = ({
  setIsRemediationOpen,
}: {
  setIsRemediationOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const {
    data: { data: cloudPostures },
  } = useGetComplianceDetails();
  const data = cloudPostures.length ? cloudPostures[0] : undefined;

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
          <div className="ml-[10px]">
            <PostureStatusBadge
              className="w-full max-w-none"
              status={data?.status as PostureSeverityType}
            />
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

const CopyField = ({ value }: { value: string }) => {
  const { copy, isCopied } = useCopyToClipboardState();

  return (
    <div className="absolute right-0 top-0 hidden group-hover:block">
      {isCopied ? (
        <IconButton
          size="sm"
          variant="flat"
          color="success"
          icon={
            <span className="w-3 h-3 block">
              <CheckIcon />
            </span>
          }
        />
      ) : (
        <IconButton
          size="sm"
          variant="flat"
          onClick={() => copy(value)}
          icon={
            <span className="w-3 h-3 block">
              <CopyLineIcon />
            </span>
          }
        />
      )}
    </div>
  );
};

const DetailsComponent = ({
  isRemediationOpen,
  setIsRemediationOpen,
}: {
  isRemediationOpen: boolean;
  setIsRemediationOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const {
    data: { data: cloudPostures },
  } = useGetComplianceDetails();

  if (!cloudPostures.length) {
    return (
      <div className="flex items-center p-4 justify-center">
        <h3 className="text-p1a">No details found</h3>
      </div>
    );
  }

  const cloudPosture = cloudPostures[0];

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

  const keyValues = getFieldsKeyValue(cloudPosture ?? {}, {
    hiddenFields: [
      'status',
      'description',
      'node_name',
      'severity',
      'type',
      'count',
      'node_id',
      'resources',
    ],
    priorityFields: [
      'cloud_provider',
      'region',
      'account_id',
      'compliance_check_type',
      'control_id',
      'group',
      'title',
      'service',
      'reason',
      'resource',
      'masked',
      'updated_at',
    ],
  });

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
              <CopyField value={valueAsStr} />
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
            <CopyField value={JSON.stringify(cloudPosture.resources)} />
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

const PostureCloudDetailModal = () => {
  const { navigate } = usePageNavigation();
  const [searchParams] = useSearchParams();
  const [isRemediationOpen, setIsRemediationOpen] = useState(false);

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
        <Header setIsRemediationOpen={setIsRemediationOpen} />
        <SlidingModalContent>
          <div className="h-full">
            <DetailsComponent
              isRemediationOpen={isRemediationOpen}
              setIsRemediationOpen={setIsRemediationOpen}
            />
          </div>
        </SlidingModalContent>
      </Suspense>
    </SlidingModal>
  );
};

export const module = {
  element: <PostureCloudDetailModal />,
};
