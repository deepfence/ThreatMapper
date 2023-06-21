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
import { CveCVSSScore, SeverityBadge } from '@/components/SeverityBadge';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { queries } from '@/queries';
import { usePageNavigation } from '@/utils/usePageNavigation';

function useGetSecretDetails() {
  const { secretId } = useParams();
  return useSuspenseQuery({
    ...queries.secret.secret({
      id: secretId ?? '',
    }),
  });
}

const Header = () => {
  const {
    data: { data },
  } = useGetSecretDetails();

  const { copy, isCopied } = useCopyToClipboardState();

  return (
    <SlidingModalHeader>
      <div className="pt-5 px-5 dark:bg-[linear-gradient(to_bottom,_#15253e_96px,_transparent_0)]">
        <div className="flex items-center gap-2 dark:text-text-text-and-icon">
          <div className="h-4 w-4 shrink-0">
            <SecretsIcon />
          </div>
          <h3 className="text-h3">{data?.name ?? '-'}</h3>
        </div>
        <div className="mt-[18px] flex">
          <div className="px-4 flex flex-col gap-2">
            <div className="dark:bg-bg-left-nav p-2 rounded flex flex-col gap-1">
              <div className="text-p9 dark:text-text-text-and-icon whitespace-nowrap">
                Severity score
              </div>
              <div>
                <CveCVSSScore
                  score={data?.score ?? 0}
                  className="text-h1"
                  iconClassName="h-9 w-9"
                />
              </div>
            </div>
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
            <div
              className="mt-7 text-sm leading-5 dark:text-text-text-and-icon max-h-64 overflow-y-auto"
              style={{
                wordBreak: 'break-word',
              }}
            >
              {data?.full_filename ?? '-'}
            </div>
          </div>
        </div>
      </div>
    </SlidingModalHeader>
  );
};

const DetailsComponent = () => {
  const {
    data: { data: secret },
  } = useGetSecretDetails();

  if (!secret) {
    return (
      <div className="flex items-center p-4 justify-center">
        <h3 className="text-p1">No details found</h3>
      </div>
    );
  }

  const omitFields: (keyof ModelSecret)[] = ['name', 'full_filename', 'level', 'score'];

  return (
    <div className="flex flex-wrap gap-y-[30px] gap-x-[14px]">
      {Object.keys(secret ?? {})
        .filter((key) => {
          if (omitFields.includes(key as keyof ModelSecret)) return false;
          return true;
        })
        .map((key) => {
          const label = key.replaceAll('_', ' ');
          const value = (secret ?? {})[key as keyof ModelSecret];
          return (
            <div key={key} className="flex flex-col grow basis-[45%] max-w-full gap-1">
              <div className="text-p3 dark:text-text-text-and-icon">{label}</div>
              <div className="text-p1 dark:text-text-input-value">
                {String(value).length ? String(value) : '-'}
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
