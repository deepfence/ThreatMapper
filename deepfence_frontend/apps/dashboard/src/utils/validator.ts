// not white space on input
const regex = /^\S*$/;

export const containsWhiteSpace = (value: string) => {
  if (!value) {
    return true;
  }
  return !regex.test(value);
};
