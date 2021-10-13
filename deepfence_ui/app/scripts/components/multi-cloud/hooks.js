/* eslint-disable */
const { useState, useEffect } = require("react");

export const useDOMSize = (element) => {
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

  return [width, height];
};

export const useVisibilityState = () => {
  const [visible, setVisible] = useState(
    document.visibilityState === "visible"
  );

  useEffect(() => {
    const cb = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", cb);
    return () => {
      document.removeEventListener("visibilitychange", cb);
    };
  }, [setVisible]);

  return visible;
};
