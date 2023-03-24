import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
dayjs.extend(relativeTime);

export const formatMilliseconds = (milliseconds: number) => {
  return dayjs.utc(milliseconds).local().format('MMM D YYYY H:mm:ss');
};

export const formatStringDate = (date: string) => {
  return dayjs.utc(new Date(date).getTime()).local().format('MMM D YYYY H:mm:ss');
};

export const formatToRelativeTimeFromNow = (date: string | Date | number) => {
  return dayjs(date).fromNow();
};
