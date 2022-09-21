import type { Dispatch, FC, ReactNode, SetStateAction } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

export const THEME_LIGHT = 'light';
export const THEME_DARK = 'dark';

export type Mode = string | undefined | 'light' | 'dark';

interface ThemeContextProps {
  mode?: Mode;
  toggleMode?: () => void | null;
}

export const ThemeContext = createContext<ThemeContextProps>({});

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
    const newPreference = mode == 'dark' ? 'light' : 'dark';
    setMode(newPreference);
    savePreference(newPreference);
  };

  if (usePreferences) {
    useEffect(() => {
      // check system theme
      const userPreference =
        !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      /**
       * Check user had applied theme choice, if so set the theme otherwise set system preference theme.
       */
      const userAppliedTheme = localStorage.getItem('theme');

      if (!userAppliedTheme) {
        const userMode = userPreference ? 'dark' : 'light';
        if (userMode) {
          setMode(userMode);
        }
      } else {
        setMode(userAppliedTheme);
      }
    }, []);

    useEffect(() => {
      if (!mode) {
        return;
      }
      if (mode != 'dark') {
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
      }
    }, [mode]);
  }

  return { mode, setMode, toggleMode };
};
