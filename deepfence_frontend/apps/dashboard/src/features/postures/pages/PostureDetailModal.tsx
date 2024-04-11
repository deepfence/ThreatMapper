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
import { DFLink } from '@/components/DFLink';
import { CheckIcon } from '@/components/icons/common/Check';
import { CopyLineIcon } from '@/components/icons/common/CopyLine';
import { PopOutIcon } from '@/components/icons/common/PopOut';
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
    ...queries.lookup.compliances({
      complianceIds: [complianceId ?? ''],
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
    data: { data: postures },
  } = useGetComplianceDetails();
  const data = postures.length ? postures[0] : undefined;
  const { copy, isCopied } = useCopyToClipboardState();

  return (
    <SlidingModalHeader>
      <div className="pt-5 px-5 dark:bg-[linear-gradient(to_bottom,_#15253e_96px,_transparent_0)] bg-[linear-gradient(to_bottom,_#f6f7f9_96px,_transparent_0)]">
        <div className="flex items-center gap-2 text-text-text-and-icon pr-8">
          <div className="h-4 w-4 shrink-0">
            <PostureIcon />
          </div>
          <h3 className="text-h3 grow-0 overflow-hidden">
            <TruncatedText text={data?.description ?? '-'} />
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
    data: { data: postures },
  } = useGetComplianceDetails();

  if (!postures.length) {
    return (
      <div className="flex items-center p-4 justify-center">
        <h3 className="text-p1a">No details found</h3>
      </div>
    );
  }
  const posture = postures[0];

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
          meta={
            posture.node_type === 'host'
              ? {
                  type: 'postureLinux',
                  args: {
                    compliance_check_type: posture.compliance_check_type,
                    description: posture.description,
                    query_type: 'remediation',
                    test_number: posture.test_number,
                  },
                }
              : {
                  type: 'postureKubernetes',
                  args: {
                    compliance_check_type: posture.compliance_check_type,
                    description: posture.description,
                    query_type: 'remediation',
                  },
                }
          }
          onBackButtonClick={() => {
            setIsRemediationOpen(false);
          }}
        />
      </Suspense>
    );
  }

  const keyValues = getFieldsKeyValue(posture ?? {}, {
    hiddenFields: [
      'status',
      'test_severity',
      'test_number',
      'rule_id',
      'resources',
      'node_type',
      'node_id',
    ],
    priorityFields: [
      'compliance_check_type',
      'description',
      'test_desc',
      'test_category',
      'test_rationale',
      'remediation_ansible',
      'remediation_puppet',
      'remediation_script',
      'resource',
      'masked',
      'updated_at',
    ],
  });

  return (
    <div className="flex flex-wrap gap-y-[30px] gap-x-[14px] py-[18px] px-5">
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
            <div className="text-p1 text-text-input-value">
              {key in timeFormatKey ? formatMilliseconds(+valueAsStr) : valueAsStr}
            </div>
          </div>
        );
      })}
      {posture.resources?.length ? (
        <div className="flex flex-col grow basis-[100%] max-w-full gap-1 group">
          <div className="basis-[45%] flex relative">
            <div className="text-p3 text-text-text-and-icon">Resources</div>
            <CopyField value={JSON.stringify(posture.resources)} />
          </div>
          <div className="text-p1 flex flex-col">
            {posture.resources.map((resource) => {
              if (!resource.node_id || !resource.node_type) {
                return null;
              }
              let redirectPath = '';
              if (resource.node_type === 'host') {
                redirectPath = `host?hosts=${resource.node_id}`;
              } else if (resource.node_type === 'container') {
                redirectPath = `container?containers=${resource.node_id}`;
              } else if (resource.node_type === 'cluster') {
                redirectPath = `kubernetes_cluster?clusters=${resource.node_id}`;
              }
              return (
                <DFLink
                  key={resource.node_id}
                  to={`/topology/table/${redirectPath}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-p2 flex items-center gap-3"
                >
                  <span className="h-4 w-4 shrink-0">
                    <PopOutIcon />
                  </span>
                  <span className="truncate">{resource.name}</span>
                </DFLink>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const PostureDetailModals = () => {
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
  element: <PostureDetailModals />,
};
