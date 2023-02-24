export const getObjectKeys = <T extends object>(obj: T): Array<keyof T> => {
  const keys: Array<keyof T> = [];

  for (const key in obj) {
    keys.push(key);
  }

  return keys;
};
