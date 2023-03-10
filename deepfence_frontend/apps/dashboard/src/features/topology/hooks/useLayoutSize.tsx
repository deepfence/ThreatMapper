import { useEffect, useState } from 'react';

export const useLayoutSize = (element: HTMLElement | null) => {
  const [width, setWidth] = useState(element?.offsetWidth);
  const [height, setHeight] = useState(element?.offsetHeight);

  useEffect(() => {
    if (element === null) {
      return;
    }

    setWidth(element.offsetWidth);
    setHeight(element.offsetHeight);

    const obs = new ResizeObserver(() => {
      setWidth(element.offsetWidth);
      setHeight(element.offsetHeight);
    });
    obs.observe(element);

    return () => {
      obs.disconnect();
    };
  }, [element]);

  return { width, height };
};
