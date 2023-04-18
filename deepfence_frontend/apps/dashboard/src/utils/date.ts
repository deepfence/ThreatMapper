import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
dayjs.extend(relativeTime);

export const formatMilliseconds = (date: number | string) => {
  return dayjs.utc(date).local().format('MMM D YYYY H:mm:ss');
};

export const formatToRelativeTimeFromNow = (date: string | Date | number) => {
  return dayjs(date).fromNow();
};

export const formatToString = (date: string | Date | number) => {
  return dayjs(date).local().format('MMM D YYYY H:mm:ss');
};
