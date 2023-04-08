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

const compactFormatter = Intl.NumberFormat('en-US', {
  notation: 'compact',
});
export const abbreviateNumber = (value: number) => {
  return compactFormatter.format(value);
};
