import { createContext, useContext, useEffect, useState } from 'react';

export interface NudgeValue {
  id: string;
  type: 'info' | 'warn' | 'error';
  title: string;
  text: string;
  remindBackAfterMS: number;
  collapsed?: boolean;
}

export const NudgeContext = createContext<{
  nudgeValue: NudgeValue | null;
  setNudgeValue: (value: NudgeValue | null) => void;
}>({
  nudgeValue: null,
  setNudgeValue: () => {
    /** noop */
  },
});

export function useNudgeState() {
  const [value, setValue] = useState<NudgeValue | null>(null);

  return { nudgeValue: value, setNudgeValue: setValue };
}

export function useNudgeValue() {
  return useContext(NudgeContext);
}

export function useNudge(nudge: NudgeValue, show: boolean) {
  const { setNudgeValue } = useContext(NudgeContext);
  const [cachedNudge] = useState(nudge);

  useEffect(() => {
    return () => {
      // reset nudge value on unmount
      setNudgeValue(null);
    };
  }, []);

  useEffect(() => {
    if (show) {
      // now determine based on id and backoffms to set the nudge or not.
      const collapsedAt = getNudgeCollapsedTimeFromStorage(cachedNudge.id);
      setNudgeValue({
        ...cachedNudge,
        collapsed:
          !collapsedAt || collapsedAt + nudge.remindBackAfterMS < new Date().getTime()
            ? false
            : true,
      });
    }
  }, [show]);
}

function getNudgeCollapsedTimeFromStorage(nudgeId: string) {
  const storageValue = localStorage.getItem(`nudgestate-${nudgeId}`);
  if (!storageValue?.length) return null;
  return parseInt(storageValue);
}

export function setNudgeCollapsedTimeToStorage(nudgeId: string) {
  localStorage.setItem(`nudgestate-${nudgeId}`, String(new Date().getTime()));
}
export function deleteNudgeCollapsedTimeFromStorage(nudgeId: string) {
  localStorage.removeItem(`nudgestate-${nudgeId}`);
}
