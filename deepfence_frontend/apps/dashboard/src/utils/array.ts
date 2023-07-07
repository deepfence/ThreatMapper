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
    alarm: 95,
    high: 90,
    medium: 85,
    warn: 80,
    low: 75,
    note: 70,
    info: 65,
    delete: 64,
    ok: 60,
    pass: 55,
    skip: 50,
    unknown: 45,
  };

  return sortBy(list, [
    (o) => {
      return severityPriority[o[severityKey as keyof typeof o] as AllSeverityType];
    },
  ]);
};
