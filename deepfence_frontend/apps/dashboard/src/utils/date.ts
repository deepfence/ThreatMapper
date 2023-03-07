import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

export const formatMilliseconds = (milliseconds: number) => {
  return dayjs.utc(milliseconds).local().format('MMM D YYYY H:mm:ss');
};
