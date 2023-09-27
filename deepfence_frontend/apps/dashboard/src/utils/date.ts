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

export function convertSeconds(seconds: number): string {
  const daysInAYear = 365.25; // Accounting for leap years

  if (seconds < 60) {
    return `${seconds} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else if (seconds < 31557600) {
    const days = Math.floor(seconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''}`;
  } else {
    const years = seconds / (86400 * daysInAYear);
    const fractionalYears = seconds % (86400 * daysInAYear);
    let fractionalSeconds = '';
    if (fractionalYears > 0) {
      fractionalSeconds = convertSeconds(fractionalYears);
    }
    const displayYears = Math.floor(years);

    return `${displayYears} year${displayYears !== 1 ? 's' : ''} ${fractionalSeconds}`;
  }
}
