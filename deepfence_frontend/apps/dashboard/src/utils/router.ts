import { defer as routerDefer } from 'react-router-dom';

type MaybePromiseObject<T> = {
  [K in keyof T]: Awaited<T[K]>;
};

export type TypedDeferredData<Data extends Record<string, unknown>> = ReturnType<
  typeof routerDefer
> & {
  data: MaybePromiseObject<Data>;
};

export function typedDefer<Data extends Record<string, unknown>>(data: Data) {
  return routerDefer(data) as TypedDeferredData<Data>;
}
