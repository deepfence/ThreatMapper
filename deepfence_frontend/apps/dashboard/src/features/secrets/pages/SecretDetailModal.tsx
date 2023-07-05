import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Button,
  CircleSpinner,
  SlidingModal,
  SlidingModalCloseButton,
  SlidingModalContent,
  SlidingModalHeader,
} from 'ui-components';

import { ModelSecret } from '@/api/generated/models/ModelSecret';
import { useCopyToClipboardState } from '@/components/CopyToClipboard';
import { CopyLineIcon } from '@/components/icons/common/CopyLine';
import { SeverityBadge } from '@/components/SeverityBadge';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { queries } from '@/queries';
import { usePageNavigation } from '@/utils/usePageNavigation';

function useGetSecretDetails() {
  const { secretId } = useParams();
  return useSuspenseQuery({
    ...queries.lookup.secrets({
      secretIds: [secretId ?? ''],
    }),
  });
}

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
  return labelKey.replaceAll('_', ' ').replaceAll('id', 'ID');
}

const DetailsComponent = () => {
  const {
    data: { data: secrets },
  } = useGetSecretDetails();

  if (!secrets.length) {
    return (
      <div className="flex items-center p-4 justify-center">
        <h3 className="text-p1">No details found</h3>
      </div>
    );
  }

  const secret = secrets[0];

  const omitFields: (keyof ModelSecret)[] = ['name', 'level', 'score'];

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
          } else {
            valueAsStr = String(value);
          }
          return (
            <div key={key} className="flex flex-col grow basis-[45%] max-w-full gap-1">
              <div className="text-p3 dark:text-text-text-and-icon first-letter:capitalize">
                {label}
              </div>
              <div className="text-p1 dark:text-text-input-value break-words">
                {valueAsStr}
              </div>
            </div>
          );
        })}
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
