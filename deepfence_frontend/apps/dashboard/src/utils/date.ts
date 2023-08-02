import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
dayjs.extend(relativeTime);

export const formatMilliseconds = (date: number | Date | string, format?: string) => {
  return dayjs
    .utc(date)
    .local()
    .format(format || 'MMM D YYYY H:mm:ss');
};

export const formatToRelativeTimeFromNow = (date: string | Date | number) => {
  return dayjs(date).fromNow();
};
