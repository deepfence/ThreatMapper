export type ObjectWithNonNullableValues<T> = {
  [P in keyof T]: Exclude<T[P], null>;
};
