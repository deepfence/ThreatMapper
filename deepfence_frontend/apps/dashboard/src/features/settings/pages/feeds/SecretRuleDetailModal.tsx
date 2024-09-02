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

import { CopyButton, useCopyToClipboardState } from '@/components/CopyToClipboard';
import { CopyLineIcon } from '@/components/icons/common/CopyLine';
import { SeverityBadge } from '@/components/SeverityBadge';
import { AlertIcon } from '@/components/sideNavigation/icons/Alert';
import { TruncatedText } from '@/components/TruncatedText';
import { queries } from '@/queries';
import { formatMilliseconds } from '@/utils/date';
import { getFieldsKeyValue } from '@/utils/detailsPanel';
import { replacebyUppercaseCharacters } from '@/utils/label';
import { usePageNavigation } from '@/utils/usePageNavigation';

function useLookupSecretRule() {
  const { ruleId } = useParams();
  return useSuspenseQuery({
    ...queries.lookup.lookupSecretRule({
      nodeId: ruleId ?? '',
    }),
  });
}

const timeFormatKey = {
  updated_at: 'updated_at',
};

const Header = () => {
  const {
    data: { rule },
  } = useLookupSecretRule();
  const data = rule ?? undefined;
  const { copy, isCopied } = useCopyToClipboardState();

  return (
    <SlidingModalHeader>
      <div className="py-5 px-5 dark:bg-[linear-gradient(to_bottom,_#15253e_96px,_transparent_0)] bg-[linear-gradient(to_bottom,_#EEEEEE_96px,_transparent_0)]">
        <div className="flex items-center gap-2 text-text-text-and-icon pr-8">
          <div className="h-4 w-4 shrink-0">
            <AlertIcon />
          </div>
          <h3 className="text-h3  grow-0 overflow-hidden">
            <TruncatedText text={data?.summary ?? '-'} />
          </h3>
        </div>
        <div className="mt-[18px] flex">
          <div className="px-4 flex flex-col gap-2">
            <div>
              <SeverityBadge
                className="w-full max-w-none"
                severity={data?.severity ?? '-'}
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

const DetailsComponent = () => {
  const {
    data: { rule },
  } = useLookupSecretRule();

  if (!rule) {
    return (
      <div className="flex items-center p-4 justify-center">
        <h3 className="text-p1a">No details found</h3>
      </div>
    );
  }

  const keyValues = getFieldsKeyValue(rule ?? {}, {
    hiddenFields: [],
    priorityFields: ['rule_id', 'severity', 'summary', 'payload'],
    base64EncodedFields: ['payload'],
    codeFields: ['payload'],
  });

  return (
    <div className="flex flex-wrap gap-y-[30px] gap-x-[14px] py-[18px] px-5">
      {keyValues.map(({ key, value, isCode }) => {
        const label = processLabel(key);
        let valueAsStr = '-';
        if (Array.isArray(value)) {
          valueAsStr = value.join(', ');
        } else if (typeof value === 'string') {
          valueAsStr = value;
        } else {
          valueAsStr = String(value);
        }
        const DetailsComponent = isCode
          ? ({
              children,
              ...rest
            }: React.DetailedHTMLProps<
              React.HTMLAttributes<HTMLPreElement>,
              HTMLPreElement
            >) => <pre {...rest}>{children}</pre>
          : ({
              children,
              ...rest
            }: React.DetailedHTMLProps<
              React.HTMLAttributes<HTMLDivElement>,
              HTMLDivElement
            >) => <div {...rest}>{children}</div>;
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
            <DetailsComponent className="text-p1 dark:text-text-input-value text-text-text-and-icon break-words overflow-auto">
              {key in timeFormatKey ? formatMilliseconds(+valueAsStr) : valueAsStr}
            </DetailsComponent>
          </div>
        );
      })}
    </div>
  );
};

const NetworkIncidentRuleDetailModal = () => {
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
        <Header />
        <SlidingModalContent>
          <div className="h-full">
            <DetailsComponent />
          </div>
        </SlidingModalContent>
      </Suspense>
    </SlidingModal>
  );
};

export const module = {
  element: <NetworkIncidentRuleDetailModal />,
};
