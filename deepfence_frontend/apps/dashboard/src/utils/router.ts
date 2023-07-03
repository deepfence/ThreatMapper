import {
  defer as routerDefer,
  IndexRouteObject,
  NavigateFunction,
  NonIndexRouteObject,
} from 'react-router-dom';

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

type MetaType = {
  title: string;
};

export type CustomRouteObject =
  | (IndexRouteObject & {
      meta?: MetaType;
    })
  | (Omit<NonIndexRouteObject, 'children'> & {
      meta?: MetaType;
      children?: CustomRouteObject[];
    });

export const historyHelper: {
  navigate?: NavigateFunction;
} = {};
