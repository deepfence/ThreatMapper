export const formatPercentage = (
  value: number | string,
  {
    minimumFractionDigits = 0,
    maximumFractionDigits = Number.MAX_SAFE_INTEGER,
  }: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  },
) => {
  const formatter = Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits,
    maximumFractionDigits,
  });
  return formatter.format(Number(value) / 100);
};

export const formatNumber = (
  value: number | string,
  {
    minimumFractionDigits = 0,
    maximumFractionDigits = Number.MAX_SAFE_INTEGER,
  }: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  },
) => {
  const formatter = Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  });
  return formatter.format(Number(value));
};

const compactFormatter = Intl.NumberFormat('en-US', {
  notation: 'compact',
});
export const abbreviateNumber = (value: number) => {
  return compactFormatter.format(value);
};

export const formatMemory = (bytes: number, decimals = 1) => {
  const thresh = 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }

  const units = ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let u = -1;
  const r = 10 ** decimals;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

  return `${bytes.toFixed(decimals)} ${units[u]}`;
};
