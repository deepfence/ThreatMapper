import { upperCase } from 'lodash-es';
import { Button } from 'ui-components';

import { useCopyToClipboardState } from '@/components/CopyToClipboard';
import { CopyLineIcon } from '@/components/icons/common/CopyLine';

export const Metadata = ({
  data,
  title,
}: {
  data: Record<string, string | boolean>;
  title?: string;
}) => {
  const keys = Object.keys(data);
  const { copy, isCopied } = useCopyToClipboardState();
  if (!keys.length) return null;
  return (
    <div className="relative">
      {title?.length ? <div className="text-h5 dark:text-white mb-3">{title}</div> : null}
      <Button
        variant="flat"
        size="sm"
        className="absolute right-0 -top-4"
        onClick={() => {
          copy(JSON.stringify(data ?? {}));
        }}
        startIcon={<CopyLineIcon />}
      >
        {isCopied ? 'Copied JSON' : 'Copy JSON'}
      </Button>

      <div className="mt-2 flex flex-wrap justify-between gap-x-2 gap-y-[30px] max-w-full">
        {keys.map((key) => (
          <div
            key={key}
            className="flex flex-1 basis-[48%] min-w-[48%] max-w-full flex-col gap-y-2"
          >
            <div className="text-p3  dark:text-text-text-and-icon capitalize">
              {toTopologyMetadataKey(key)}
            </div>
            <div className="text-p1 dark:text-text-input-value break-words">
              {data[key]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const UPPERCASE_WORDS = ['ip', 'id', 'cidr', 'os', 'vm'];
function toTopologyMetadataKey(key: string) {
  return key
    .split('_')
    .map((word) => {
      if (UPPERCASE_WORDS.includes(word)) return upperCase(word);
      return word;
    })
    .join(' ');
}

export function toTopologyMetadataString(
  value:
    | string
    | boolean
    | number
    | Array<string>
    | Array<boolean>
    | Array<number>
    | undefined
    | null,
): string {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  } else if (typeof value === 'string' && value.length > 0) {
    return value;
  } else if (Array.isArray(value) && value.length > 0) {
    return value
      .map((val) => {
        return toTopologyMetadataString(val);
      })
      .join(', ');
  } else if (typeof value === 'number') {
    return value.toString();
  }
  return '-';
}
