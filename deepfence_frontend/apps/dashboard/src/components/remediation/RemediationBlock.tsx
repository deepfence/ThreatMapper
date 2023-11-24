import { useSuspenseQuery } from '@suspensive/react-query';
import { range } from 'lodash-es';
import { useEffect, useMemo, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { cn } from 'tailwind-preset';
import { Button, Dropdown, DropdownItem, Tooltip } from 'ui-components';

import { getGenerativeAIIntegraitonClient } from '@/api/api';
import {
  ModelGenerativeAiIntegrationCloudPostureRequest,
  ModelGenerativeAiIntegrationCloudPostureRequestRemediationFormatEnum,
  ModelGenerativeAiIntegrationKubernetesPostureRequest,
  ModelGenerativeAiIntegrationLinuxPostureRequest,
  ModelGenerativeAiIntegrationMalwareRequest,
  ModelGenerativeAiIntegrationSecretRequest,
  ModelGenerativeAiIntegrationVulnerabilityRequest,
} from '@/api/generated';
import { ArrowLine } from '@/components/icons/common/ArrowLine';
import { CaretDown } from '@/components/icons/common/CaretDown';
import { CheckIcon } from '@/components/icons/common/Check';
import { InfoStandardIcon } from '@/components/icons/common/InfoStandard';
import { RemediationError } from '@/components/remediation/RemediationError';
import { RemediationNoIntegration } from '@/components/remediation/RemediationNoIntegration';
import { RemediationPre } from '@/components/remediation/RemediationPre';
import { queries } from '@/queries';
import { apiWrapper } from '@/utils/api';

const textDecoder = new TextDecoder('utf-8');

type RemediationRequestWithoutCommonTypes<T> = Omit<
  T,
  'integration_id' | 'remediation_format'
>;

interface RemediationBlockProps {
  meta:
    | {
        type: 'postureCloud';
        args: RemediationRequestWithoutCommonTypes<ModelGenerativeAiIntegrationCloudPostureRequest>;
      }
    | {
        type: 'postureLinux';
        args: RemediationRequestWithoutCommonTypes<ModelGenerativeAiIntegrationLinuxPostureRequest>;
      }
    | {
        type: 'postureKubernetes';
        args: RemediationRequestWithoutCommonTypes<ModelGenerativeAiIntegrationKubernetesPostureRequest>;
      }
    | {
        type: 'cve';
        args: RemediationRequestWithoutCommonTypes<ModelGenerativeAiIntegrationVulnerabilityRequest>;
      }
    | {
        type: 'secret';
        args: RemediationRequestWithoutCommonTypes<ModelGenerativeAiIntegrationSecretRequest>;
      }
    | {
        type: 'malware';
        args: RemediationRequestWithoutCommonTypes<ModelGenerativeAiIntegrationMalwareRequest>;
      };
  onBackButtonClick?: () => void;
}

interface RemediationCompletionProps {
  meta:
    | {
        type: 'postureCloud';
        args: ModelGenerativeAiIntegrationCloudPostureRequest;
      }
    | {
        type: 'postureLinux';
        args: ModelGenerativeAiIntegrationLinuxPostureRequest;
      }
    | {
        type: 'postureKubernetes';
        args: ModelGenerativeAiIntegrationKubernetesPostureRequest;
      }
    | {
        type: 'cve';
        args: ModelGenerativeAiIntegrationVulnerabilityRequest;
      }
    | {
        type: 'secret';
        args: ModelGenerativeAiIntegrationSecretRequest;
      }
    | {
        type: 'malware';
        args: ModelGenerativeAiIntegrationMalwareRequest;
      };
}

const FORMAT_SELECTION_DISABLED_TYPES: Array<RemediationCompletionProps['meta']['type']> =
  ['secret', 'malware'];

export const RemediationBlock = ({ meta, onBackButtonClick }: RemediationBlockProps) => {
  const {
    data: { data, message: errorMessage },
  } = useListAIIntegrations();

  const [integrationId, setIntegrationId] = useState<number>(() => {
    const defaultIntegration =
      data.find((integration) => {
        return !!integration.default_integration;
      }) ?? data?.[0];

    return defaultIntegration?.id ?? 0;
  });

  const [format, setFormat] =
    useState<ModelGenerativeAiIntegrationCloudPostureRequestRemediationFormatEnum>('all');

  const memoedMeta = useMemo(() => {
    return {
      ...meta,
      args: {
        ...meta.args,
        integration_id: integrationId,
        remediation_format: format,
      },
    } as RemediationCompletionProps['meta'];
  }, [integrationId, format]);

  if (errorMessage?.length) {
    return (
      <RemediationError
        errorMessage={errorMessage}
        onBackButtonClick={onBackButtonClick}
      />
    );
  }

  if (!data.length || !integrationId) {
    return <RemediationNoIntegration onBackButtonClick={onBackButtonClick} />;
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex flex-col gap-4 px-5 pt-4">
        <div className="flex justify-between items-center">
          <span className="flex items-center text-p6 gap-2 dark:text-text-input-value">
            {onBackButtonClick && (
              <button
                type="button"
                className="h-4 w-4 text-text-link -rotate-90"
                onClick={() => {
                  onBackButtonClick();
                }}
              >
                <ArrowLine />
              </button>
            )}
            <span>Remediations powered by </span>
            <Dropdown
              align="end"
              triggerAsChild
              content={data.map((integration) => {
                return (
                  <DropdownItem
                    key={integration.id}
                    onClick={() => {
                      setIntegrationId(integration.id ?? 0);
                    }}
                  >
                    {integrationId === integration.id ? (
                      <div className="h-4 w-4">
                        <CheckIcon />
                      </div>
                    ) : (
                      <div className="h-4 w-4" />
                    )}
                    {integration.label ?? integration.integration_type}
                  </DropdownItem>
                );
              })}
            >
              <button type="button" className="text-p3 flex gap-1 items-center">
                <span>
                  {data.find((int) => int.id === integrationId)?.label ?? integrationId}
                </span>
                <div className="dark:text-accent-accent h-4 w-4">
                  <CaretDown />
                </div>
              </button>
            </Dropdown>
          </span>
          <div className="flex items-center gap-2">
            <Tooltip content="The suggestions and remediation steps proposed by Generative AI are derived from the analysis of existing information and may not encompass the most recent updates or evolving best practices in cloud security. This information is not a substitute for professional advice or guidance from certified experts in the field of cybersecurity and cloud compliance. The accuracy, applicability, and relevance of the generated content can vary depending on the specific nature of the compliance issue or CVE. Therefore, it is crucial to cross-reference and verify any generated remediation steps with current industry standards, official documentation from the cloud service provider, or consult with qualified professionals before implementation.">
              <div className="flex items-center gap-1">
                <div className="h-4 w-4 flex items-center">
                  <InfoStandardIcon />
                </div>
                <span className="text-p5">Disclaimer</span>
              </div>
            </Tooltip>
          </div>
        </div>
        {!FORMAT_SELECTION_DISABLED_TYPES.includes(meta.type) ? (
          <div className="flex items-center overflow-x-auto gap-2">
            <Button
              className="normal-case"
              color="default"
              variant={format !== 'all' ? 'outline' : undefined}
              size="sm"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setFormat('all');
              }}
            >
              Any
            </Button>
            <Button
              className="normal-case"
              color="default"
              variant={format !== 'cli' ? 'outline' : undefined}
              size="sm"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setFormat('cli');
              }}
            >
              CLI
            </Button>
            <Button
              className="normal-case"
              color="default"
              variant={format !== 'terraform' ? 'outline' : undefined}
              size="sm"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setFormat('terraform');
              }}
            >
              Terraform
            </Button>
            <Button
              className="normal-case"
              color="default"
              variant={format !== 'pulumi' ? 'outline' : undefined}
              size="sm"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setFormat('pulumi');
              }}
            >
              Pulumi
            </Button>
          </div>
        ) : null}
      </div>
      <div className="flex-1 overflow-hidden">
        <RemediationCompletion meta={memoedMeta} />
      </div>
    </div>
  );
};

function useAIIntegration({ meta }: { meta: RemediationCompletionProps['meta'] }) {
  const mountedRef = useRef<string | null>(null);
  const [remediationMd, setRemediationMd] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    mountedRef.current = 'mounted';
    return () => {
      mountedRef.current = null;
    };
  }, []);

  useEffect(() => {
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    const abortController = new AbortController();
    setIsLoading(true);
    (async () => {
      const response = await getRemediation({ meta, signal: abortController.signal });
      setIsLoading(false);
      if (!response.ok) {
        console.error(response.error);
        throw new Error('Response from ai integration is not ok');
      }

      const fetchResponse = response.value.raw;

      // A response body should always exist, if there isn't one something has gone wrong.
      if (!fetchResponse.body) {
        throw new Error('No body included in POST response object');
      }

      reader = fetchResponse.body.getReader();

      let completion = '';
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        const decodedData = textDecoder.decode(value);
        completion += decodedData ?? '';

        // do not set state if hook is unmounted.
        if (mountedRef.current?.length) {
          setRemediationMd(completion);
        }

        if (done) {
          break;
        }
      }
    })();

    return () => {
      // cancel the reader if already reading.
      reader?.cancel();

      // cancel the request if already in flight.
      abortController?.abort();

      setRemediationMd('');
      setIsLoading(false);
    };
  }, [meta]);

  return { remediationMd, isLoading };
}

async function getRemediation({
  meta,
  signal,
}: {
  meta: RemediationCompletionProps['meta'];
  signal: AbortSignal;
}) {
  if (meta.type === 'postureCloud') {
    const request = apiWrapper({
      fn: getGenerativeAIIntegraitonClient().generativeAiIntegrationCloudPostureQuery,
    });
    const response = await request(
      {
        modelGenerativeAiIntegrationCloudPostureRequest: meta.args,
      },
      {
        signal,
      },
    );
    return response;
  } else if (meta.type === 'postureLinux') {
    const request = apiWrapper({
      fn: getGenerativeAIIntegraitonClient().generativeAiIntegrationLinuxPostureQuery,
    });
    const response = await request(
      {
        modelGenerativeAiIntegrationLinuxPostureRequest: meta.args,
      },
      {
        signal,
      },
    );
    return response;
  } else if (meta.type === 'postureKubernetes') {
    const request = apiWrapper({
      fn: getGenerativeAIIntegraitonClient()
        .generativeAiIntegrationKubernetesPostureQuery,
    });
    const response = await request(
      {
        modelGenerativeAiIntegrationKubernetesPostureRequest: meta.args,
      },
      {
        signal,
      },
    );
    return response;
  } else if (meta.type === 'cve') {
    const request = apiWrapper({
      fn: getGenerativeAIIntegraitonClient().generativeAiIntegrationVulnerabilityQuery,
    });
    const response = await request(
      {
        modelGenerativeAiIntegrationVulnerabilityRequest: meta.args,
      },
      {
        signal,
      },
    );
    return response;
  } else if (meta.type === 'secret') {
    const request = apiWrapper({
      fn: getGenerativeAIIntegraitonClient().generativeAiIntegrationSecretQuery,
    });
    const response = await request(
      {
        modelGenerativeAiIntegrationSecretRequest: meta.args,
      },
      {
        signal,
      },
    );
    return response;
  } else if (meta.type === 'malware') {
    const request = apiWrapper({
      fn: getGenerativeAIIntegraitonClient().generativeAiIntegrationMalwareQuery,
    });
    const response = await request(
      {
        modelGenerativeAiIntegrationMalwareRequest: meta.args,
      },
      {
        signal,
      },
    );
    return response;
  }

  throw new Error('invalid remediation request');
}

function useListAIIntegrations() {
  return useSuspenseQuery({
    ...queries.integration.listAIIntegrations(),
  });
}

function RemediationCompletion({ meta }: RemediationCompletionProps) {
  const { remediationMd: markdownText, isLoading } = useAIIntegration({
    meta,
  });

  const loadingText = useThinkingText(isLoading);

  const markdownEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (markdownEndRef.current) {
      markdownEndRef.current.scrollIntoView({
        behavior: 'smooth',
      });
    }
  }, [markdownText]);

  return (
    <div
      className={cn(
        'pb-2 px-5 h-full overflow-y-auto',
        'prose-invert max-w-none space-y-2',
        'prose-ol:list-decimal prose-ol:list-inside',
        'prose-ul:list-disc prose-ul:list-inside',
        'prose-p:break-words',
        'prose-pre:mb-1 prose-pre:rounded-md dark:prose-pre:bg-slate-950',
        'prose-code:rounded-sm dark:prose-code:bg-slate-950 prose-code:px-1 prose-code:py-0.5',
        'dark:prose-a:text-text-link dark:prose-a:hover:underline dark:prose-a:focus:underline dark:prose-a:visited:text-purple-600 dark:prose-a:dark:visited:text-purple-500',
      )}
    >
      <Markdown
        skipHtml
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          pre: RemediationPre,
        }}
      >
        {isLoading ? loadingText : markdownText}
      </Markdown>
      <div ref={markdownEndRef}></div>
    </div>
  );
}

function useThinkingText(shouldAnimate: boolean) {
  const [numDots, setNumDots] = useState(1);

  useEffect(() => {
    let intervalId: any;
    if (shouldAnimate) {
      intervalId = setInterval(() => {
        setNumDots((prevDots) => {
          if (prevDots === 3) {
            return 1;
          }
          return prevDots + 1;
        });
      }, 300);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [shouldAnimate]);

  return `Thinking${range(0, numDots)
    .map(() => '.')
    .join('')}`;
}
