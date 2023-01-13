// not white space on input
const regex = /^\S*$/;

export const isEmptyString = (value: string) => {
  if (!value) {
    return true;
  }
  return !regex.test(value);
};
