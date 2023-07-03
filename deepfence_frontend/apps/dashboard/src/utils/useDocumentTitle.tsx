import { useEffect } from 'react';
import useLocation from 'react-use/lib/useLocation';

import { router } from '@/routes';

const defaultTitle = 'Deepfence';

export function useDocumentTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname) {
      const lastMatchedRoute = router.state.matches.at(-1);
      if (lastMatchedRoute) {
        // in future we can have meta function which can utilise the
        // loader data to generate the title
        const title = (lastMatchedRoute.route as any).meta?.title;
        document.title = `${title ? `${title} | ` : ''}${defaultTitle}`;
      }
    }
    return () => {
      document.title = defaultTitle;
    };
  }, [pathname]);
}
