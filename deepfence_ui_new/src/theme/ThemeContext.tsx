import type { Dispatch, FC, ReactNode, SetStateAction } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

import defaultTheme from './default';
import type { Theme } from './Theme';

export type Mode = string | undefined | 'light' | 'dark';

interface ThemeContextProps {
  theme: Theme;
  mode?: Mode;
  toggleMode?: () => void | null;
}

export const ThemeContext = createContext<ThemeContextProps>({
  theme: defaultTheme,
});

interface ThemeProviderProps {
  children: ReactNode;
  value: ThemeContextProps;
}

export const ThemeProvider: FC<ThemeProviderProps> = ({ children, value }) => {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextProps {
  return useContext(ThemeContext);
}

export const useThemeMode = (
  usePreferences: boolean,
): {
  mode: Mode;
  setMode: Dispatch<SetStateAction<Mode>> | undefined;
  toggleMode: (() => void) | undefined;
} => {
  if (!usePreferences)
    return {
      mode: undefined,
      setMode: undefined,
      toggleMode: undefined,
    };
  const [mode, setMode] = useState<Mode>(undefined);

  const savePreference = (m: string) => localStorage.setItem('theme', m);

  const toggleMode = () => {
    if (!mode) {
      return;
    }

    document.documentElement.classList.toggle('dark');

    savePreference(mode);
    setMode(mode == 'dark' ? 'light' : 'dark');
  };

  if (usePreferences) {
    useEffect(() => {
      const userPreference =
        !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const userMode =
        localStorage.getItem('theme') || (userPreference ? 'dark' : 'light');

      if (userMode) {
        setMode(userMode);
      }
    }, []);

    useEffect(() => {
      if (!mode) {
        return;
      }

      savePreference(mode);

      if (mode != 'dark') {
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
      }
    }, [mode]);
  }

  return { mode, setMode, toggleMode };
};
