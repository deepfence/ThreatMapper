import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

export const formatMilliseconds = (milliseconds: number) => {
  return dayjs.utc(milliseconds).local().format('MMM D YYYY H:mm:ss');
};

export const formatStringDate = (date: string) => {
  return dayjs.utc(new Date(date).getTime()).local().format('MMM D YYYY H:mm:ss');
};
