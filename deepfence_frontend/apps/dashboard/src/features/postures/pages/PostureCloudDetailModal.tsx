import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense } from 'react';
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

import { ModelCloudCompliance } from '@/api/generated';
import { useCopyToClipboardState } from '@/components/CopyToClipboard';
import { CheckIcon } from '@/components/icons/common/Check';
import { CopyLineIcon } from '@/components/icons/common/CopyLine';
import { PostureStatusBadge } from '@/components/SeverityBadge';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { queries } from '@/queries';
import { PostureSeverityType } from '@/types/common';
import { formatMilliseconds } from '@/utils/date';
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

const Header = () => {
  const {
    data: { data: cloudPostures },
  } = useGetComplianceDetails();
  const data = cloudPostures.length ? cloudPostures[0] : undefined;

  const { copy, isCopied } = useCopyToClipboardState();

  return (
    <SlidingModalHeader>
      <div className="pt-5 px-5 dark:bg-[linear-gradient(to_bottom,_#15253e_96px,_transparent_0)]">
        <div className="flex items-center gap-2 dark:text-text-text-and-icon">
          <div className="h-4 w-4 shrink-0">
            <PostureIcon />
          </div>
          <h3 className="text-h3">{data?.control_id ?? '-'}</h3>
        </div>
        <div className="py-[18px] flex">
          <div className="ml-[10px]">
            <PostureStatusBadge
              className="w-full max-w-none"
              status={data?.status as PostureSeverityType}
            />
          </div>
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

const DetailsComponent = () => {
  const {
    data: { data: cloudPostures },
  } = useGetComplianceDetails();

  if (!cloudPostures.length) {
    return (
      <div className="flex items-center p-4 justify-center">
        <h3 className="text-p1">No details found</h3>
      </div>
    );
  }

  const cloudPosture = cloudPostures[0];

  const omitFields: (keyof ModelCloudCompliance)[] = [
    'description',
    'control_id',
    'status',
    'resources',
    // 'compliance_check_type',
  ];

  return (
    <div className="flex flex-wrap gap-y-[30px] gap-x-[14px]">
      <div
        className="text-sm leading-5 dark:text-text-text-and-icon max-h-64 overflow-y-auto"
        style={{
          wordBreak: 'break-word',
        }}
      >
        {cloudPosture?.description ?? '-'}
      </div>
      {Object.keys(cloudPosture ?? {})
        .filter((key) => {
          if (omitFields.includes(key as keyof ModelCloudCompliance)) return false;
          return true;
        })
        .map((key) => {
          const label = processLabel(key);
          const value = (cloudPosture ?? {})[key as keyof ModelCloudCompliance];
          let valueAsStr = '-';
          if (Array.isArray(value)) {
            valueAsStr = value.length ? value.join(', ') : '-';
          } else if (typeof value === 'string') {
            valueAsStr = value?.length ? value : '-';
          } else if (value === undefined) {
            valueAsStr = '-';
          } else {
            valueAsStr = String(value);
          }
          return (
            <div
              key={key}
              className="flex flex-col grow basis-[45%] max-w-full gap-1 group"
            >
              <div className="flex relative">
                <div className="text-p3 dark:text-text-text-and-icon first-letter:capitalize">
                  {label}
                </div>
                <CopyField value={valueAsStr} />
              </div>
              <div className="text-p1 dark:text-text-input-value break-words">
                {key in timeFormatKey ? formatMilliseconds(+valueAsStr) : valueAsStr}
              </div>
            </div>
          );
        })}
      {cloudPosture.resources?.length ? (
        <div className="flex flex-col grow basis-[100%] max-w-full gap-1 group">
          <div className="basis-[45%] flex relative">
            <div className="text-p3 dark:text-text-text-and-icon">Resources</div>
            <CopyField value={JSON.stringify(cloudPosture.resources)} />
          </div>
          <div className="text-p1 flex flex-col">
            {cloudPosture.resources.map((resource) => {
              return (
                <div
                  key={resource.node_id}
                  className="text-p1 dark:text-text-input-value break-words"
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
  return (
    <SlidingModal
      open={true}
      onOpenChange={() => {
        navigate(`..?${searchParams.toString()}`);
      }}
      size="l"
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
        <Header />
        <SlidingModalContent>
          <div className="py-[18px] px-5">
            <DetailsComponent />
          </div>
        </SlidingModalContent>
      </Suspense>
    </SlidingModal>
  );
};

export const module = {
  element: <PostureCloudDetailModal />,
};
