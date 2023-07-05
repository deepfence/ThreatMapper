import {
  defer as routerDefer,
  IndexRouteObject,
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
  navigate: (to: string) => void;
} = {
  /**
   * FIXME(manan)
   * This is a nasty hack!
   * The problem is, as soon as createBrowserRouter is called, root loader starts
   * executing immediately. And if auth is not valid, it will try to navigate using
   * this navigate method, but by that time this navigate method is not assigned with
   * routers navigate.
   *
   * To mitigate this, we have added our makeshift navigate to handle this case. This
   * WILL do a HARD navigate.
   *
   * It appears there is no correct way to mitigate this, hence this hack.
   * REFRENCES:
   * https://github.com/remix-run/react-router/issues/9422#issuecomment-1301182219
   * https://github.com/remix-run/react-router/issues/9422#issuecomment-1305472257
   * https://jasonwatmore.com/react-router-6-navigate-outside-react-components
   */
  navigate: (to: string) => {
    const newPath = `${window.location.protocol}//${window.location.host}${
      to.startsWith('/') ? to : `/${to}`
    }`;
    window.location.href = newPath;
  },
};
