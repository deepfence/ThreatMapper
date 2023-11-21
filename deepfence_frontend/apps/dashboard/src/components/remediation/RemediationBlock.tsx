import { useSuspenseQuery } from '@suspensive/react-query';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { cn } from 'tailwind-preset';
import { Button, Dropdown, DropdownItem, Tooltip } from 'ui-components';

import { getIntegrationApiClient } from '@/api/api';
import {
  ModelAiIntegrationCloudPostureRequest,
  ModelAiIntegrationCloudPostureRequestIntegrationTypeEnum,
  ModelAiIntegrationCloudPostureRequestRemediationFormatEnum,
  ModelAiIntegrationKubernetesPostureRequest,
  ModelAiIntegrationLinuxPostureRequest,
  ModelAiIntegrationVulnerabilityRequest,
} from '@/api/generated';
import { ArrowLine } from '@/components/icons/common/ArrowLine';
import { CaretDown } from '@/components/icons/common/CaretDown';
import { CheckIcon } from '@/components/icons/common/Check';
import { InfoStandardIcon } from '@/components/icons/common/InfoStandard';
import { OpenAIIcon } from '@/components/icons/integration/OpenAI';
import { RemediationNoIntegration } from '@/components/remediation/RemediationNoIntegration';
import { RemediationPre } from '@/components/remediation/RemediationPre';
import { queries } from '@/queries';
import { apiWrapper } from '@/utils/api';

const textDecoder = new TextDecoder('utf-8');

const PROVIDER_MAP: Record<string, { icon: ReactNode }> = {
  openai: {
    icon: <OpenAIIcon />,
  },
};

type RemediationRequestWithoutCommonTypes<T> = Omit<
  T,
  'integration_type' | 'remediation_format'
>;

interface RemediationBlockProps {
  meta:
    | {
        type: 'postureCloud';
        args: RemediationRequestWithoutCommonTypes<ModelAiIntegrationCloudPostureRequest>;
      }
    | {
        type: 'postureLinux';
        args: RemediationRequestWithoutCommonTypes<ModelAiIntegrationLinuxPostureRequest>;
      }
    | {
        type: 'postureKubernetes';
        args: RemediationRequestWithoutCommonTypes<ModelAiIntegrationKubernetesPostureRequest>;
      }
    | {
        type: 'cve';
        args: RemediationRequestWithoutCommonTypes<ModelAiIntegrationVulnerabilityRequest>;
      };
  onBackButtonClick?: () => void;
}

interface RemediationCompletionProps {
  meta:
    | {
        type: 'postureCloud';
        args: ModelAiIntegrationCloudPostureRequest;
      }
    | {
        type: 'postureLinux';
        args: ModelAiIntegrationLinuxPostureRequest;
      }
    | {
        type: 'postureKubernetes';
        args: ModelAiIntegrationKubernetesPostureRequest;
      }
    | {
        type: 'cve';
        args: ModelAiIntegrationVulnerabilityRequest;
      };
}

export const RemediationBlock = ({ meta, onBackButtonClick }: RemediationBlockProps) => {
  const { data } = useListAIIntegrations();

  const [integrationType, setIntegrationType] = useState<string | undefined>(() => {
    const defaultIntegration =
      data.find((integration) => {
        return !!integration.default_integration;
      }) ?? data?.[0];

    return defaultIntegration?.integration_type;
  });

  const [format, setFormat] =
    useState<ModelAiIntegrationCloudPostureRequestRemediationFormatEnum>('all');

  const memoedMeta = useMemo(() => {
    return {
      ...meta,
      args: {
        ...meta.args,
        integration_type:
          integrationType as ModelAiIntegrationCloudPostureRequestIntegrationTypeEnum,
        remediation_format: format,
      },
    } as RemediationCompletionProps['meta'];
  }, [integrationType, format]);

  if (!data.length || !integrationType) {
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
            {PROVIDER_MAP[integrationType] ? (
              <div className="h-4 w-4">{PROVIDER_MAP[integrationType].icon}</div>
            ) : null}{' '}
            <span>Remediations powered by </span>
            <Dropdown
              align="end"
              content={data.map((integration) => {
                return (
                  <DropdownItem
                    key={integration.id}
                    onClick={() => {
                      setIntegrationType(integration.integration_type);
                    }}
                  >
                    {integrationType === integration.integration_type ? (
                      <div className="h-4 w-4">
                        <CheckIcon />
                      </div>
                    ) : null}
                    {integration.label ?? integration.integration_type}
                  </DropdownItem>
                );
              })}
            >
              <button type="button" className="text-p3 flex gap-1 items-center">
                <span>
                  {data.find((int) => int.integration_type === integrationType)?.label ??
                    integrationType}
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

  useEffect(() => {
    mountedRef.current = 'mounted';
    return () => {
      mountedRef.current = null;
    };
  }, []);

  useEffect(() => {
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    const abortController = new AbortController();
    (async () => {
      const response = await getRemediation({ meta, signal: abortController.signal });
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
    };
  }, [meta]);

  return { remediationMd };
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
      fn: getIntegrationApiClient().aIIntegrationCloudPostureQuery,
    });
    const response = await request(
      {
        modelAiIntegrationCloudPostureRequest: meta.args,
      },
      {
        signal,
      },
    );
    return response;
  } else if (meta.type === 'postureLinux') {
    const request = apiWrapper({
      fn: getIntegrationApiClient().aiIntegrationLinuxPostureQuery,
    });
    const response = await request(
      {
        modelAiIntegrationLinuxPostureRequest: meta.args,
      },
      {
        signal,
      },
    );
    return response;
  } else if (meta.type === 'postureKubernetes') {
    const request = apiWrapper({
      fn: getIntegrationApiClient().aiIntegrationKubernetesPostureQuery,
    });
    const response = await request(
      {
        modelAiIntegrationKubernetesPostureRequest: meta.args,
      },
      {
        signal,
      },
    );
    return response;
  } else if (meta.type === 'cve') {
    const request = apiWrapper({
      fn: getIntegrationApiClient().aIIntegrationVulnerabilityQuery,
    });
    const response = await request(
      {
        modelAiIntegrationVulnerabilityRequest: meta.args,
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
  const { remediationMd: markdownText } = useAIIntegration({
    meta,
  });

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
        {markdownText}
      </Markdown>
      <div ref={markdownEndRef}></div>
    </div>
  );
}
