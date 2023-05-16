import { sortBy } from 'lodash-es';

import { AllSeverityType } from '@/types/common';

export const getObjectKeys = <T extends object>(obj: T): Array<keyof T> => {
  const keys: Array<keyof T> = [];

  for (const key in obj) {
    keys.push(key);
  }

  return keys;
};

export const sortBySeverity = <O extends Record<string, any>, S = keyof O>(
  list: Array<O>,
  severityKey: S,
): Array<O> => {
  const severityPriority: {
    [k in AllSeverityType]: number;
  } = {
    critical: 100,
    alarm: 99,
    high: 98,
    medium: 97,
    warn: 96,
    low: 95,
    note: 94,
    info: 93,
    ok: 92,
    pass: 91,
    skip: 90,
    unknown: 89,
  };

  return sortBy(list, [
    (o) => {
      return severityPriority[o[severityKey as keyof typeof o] as AllSeverityType];
    },
  ]);
};
