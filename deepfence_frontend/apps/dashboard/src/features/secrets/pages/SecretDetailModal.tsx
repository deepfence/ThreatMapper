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

import { ModelSecret } from '@/api/generated/models/ModelSecret';
import { useCopyToClipboardState } from '@/components/CopyToClipboard';
import { DFLink } from '@/components/DFLink';
import { CheckIcon } from '@/components/icons/common/Check';
import { CopyLineIcon } from '@/components/icons/common/CopyLine';
import { PopOutIcon } from '@/components/icons/common/PopOut';
import { SeverityBadge } from '@/components/SeverityBadge';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { ResourceDetailModal } from '@/features/secrets/components/ResourceDetailModal';
import { queries } from '@/queries';
import { formatMilliseconds } from '@/utils/date';
import { replacebyUppercaseCharacters } from '@/utils/label';
import { usePageNavigation } from '@/utils/usePageNavigation';

function useGetSecretDetails() {
  const { secretId } = useParams();
  return useSuspenseQuery({
    ...queries.lookup.secrets({
      secretIds: [secretId ?? ''],
    }),
  });
}

const timeFormatKey = {
  updated_at: 'updated_at',
};

const Header = () => {
  const {
    data: { data: secrets },
  } = useGetSecretDetails();
  const data = secrets.length ? secrets[0] : undefined;
  const { copy, isCopied } = useCopyToClipboardState();

  return (
    <SlidingModalHeader>
      <div className="pt-5 px-5 pb-4 dark:bg-bg-breadcrumb-bar">
        <div className="flex items-center gap-2 dark:text-text-text-and-icon">
          <div className="h-4 w-4 shrink-0">
            <SecretsIcon />
          </div>
          <h3 className="text-h3">{data?.name ?? '-'}</h3>
        </div>
        <div className="mt-[18px] flex">
          <div className="px-4 flex flex-col gap-2">
            <div>
              <SeverityBadge
                className="w-full max-w-none"
                severity={data?.level ?? '-'}
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex">
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
    data: { data: secrets },
  } = useGetSecretDetails();

  const [showResourceModal, setShowResourceModal] = useState(false);

  if (!secrets.length) {
    return (
      <div className="flex items-center p-4 justify-center">
        <h3 className="text-p1">No details found</h3>
      </div>
    );
  }

  const secret = secrets[0];

  const omitFields: (keyof ModelSecret)[] = ['name', 'level', 'score', 'resources'];

  return (
    <div className="flex flex-wrap gap-y-[30px] gap-x-[14px]">
      {Object.keys(secret ?? {})
        .filter((key) => {
          if (omitFields.includes(key as keyof ModelSecret)) return false;
          return true;
        })
        .map((key) => {
          const label = processLabel(key);
          const value = (secret ?? {})[key as keyof ModelSecret];
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
      {secret.resources?.length ? (
        <div className="flex flex-col grow basis-[100%] max-w-full gap-1 group">
          <div className="basis-[45%] flex relative">
            <div className="text-p3 dark:text-text-text-and-icon">Resources</div>
            <CopyField value={JSON.stringify(secret.resources)} />
          </div>
          <div className="text-p1">
            {secret.resources.map((resource) => {
              if (!resource.node_id || !resource.node_type) {
                return null;
              }
              if (resource.node_type === 'container_image') {
                return (
                  <>
                    {showResourceModal && (
                      <ResourceDetailModal
                        open={showResourceModal}
                        onClose={setShowResourceModal}
                        nodeId={resource.node_id}
                      />
                    )}

                    <button
                      type="button"
                      key={resource.node_id}
                      onClick={() => {
                        setShowResourceModal(true);
                      }}
                      className="text-p1 w-fit dark:text-accent-accent"
                    >
                      {resource.name}
                    </button>
                  </>
                );
              }
              let redirectPath = '';
              if (resource.node_type === 'host') {
                redirectPath = `host?hosts=${resource.node_id}`;
              } else if (resource.node_type === 'container') {
                redirectPath = `container?containers=${resource.node_id}`;
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

const SecretDetailModals = () => {
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
  element: <SecretDetailModals />,
};
