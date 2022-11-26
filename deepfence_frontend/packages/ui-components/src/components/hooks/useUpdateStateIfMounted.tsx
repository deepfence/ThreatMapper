import { useEffect, useRef, useState } from 'react';

export function useUpdateStateIfMounted<T>(initialValue: T) {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const useStateResult = useState(initialValue);
  const state = useStateResult[0];
  const setState = useStateResult[1];

  const setStateIfMounted = (value: T) => {
    if (isMountedRef.current === true) {
      setState(value);
    }
  };

  return [state, setStateIfMounted] as const;
}
