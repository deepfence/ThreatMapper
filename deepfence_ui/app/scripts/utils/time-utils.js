import moment from 'moment';

// Replacement for timely dependency
export function timer(fn) {
  const timedFn = (...args) => {
    const start = new Date();
    const result = fn.apply(fn, args);
    timedFn.time = new Date() - start;
    return result;
  };
  return timedFn;
}

export function dateTimeFormat(dateTime) {
  if (!dateTime) {
    return undefined;
  }
  if (!moment(dateTime).isValid) {
    return undefined;
  }
  return moment.utc(dateTime).local().format('MMM D YYYY H:mm:ss z');
}
