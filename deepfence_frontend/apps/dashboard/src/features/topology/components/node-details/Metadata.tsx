import { upperCase } from 'lodash-es';

import { convertSeconds } from '@/utils/date';

const uptimeText = (uptime: boolean | string) => {
  return typeof uptime === 'string' ? `since ${convertSeconds(+uptime)}` : '';
};

const timeFormatKey = {
  uptime: 'uptime',
};

export const Metadata = ({
  data,
  title,
}: {
  data: Record<string, string | boolean>;
  title?: string;
}) => {
  const keys = Object.keys(data);
  if (!keys.length) return null;
  return (
    <div>
      {title?.length ? <div className="text-h5 dark:text-white mb-3">{title}</div> : null}
      <div className="flex flex-wrap justify-between gap-x-2 gap-y-[30px] max-w-full">
        {keys.map((key) => (
          <div
            key={key}
            className="flex flex-1 basis-[48%] min-w-[48%] max-w-full flex-col gap-y-2"
          >
            <div className="text-p3 text-text-text-and-icon capitalize">
              {toTopologyMetadataKey(key)}
            </div>
            <div className="text-p1a dark:text-text-input-value text-text-text-and-icon break-words">
              {key in timeFormatKey ? uptimeText(data[key]) : data[key]}
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
