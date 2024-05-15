import type { FC, ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

export const THEME_LIGHT = 'light';
export const THEME_DARK = 'dark';

export type Mode = 'light' | 'dark';

interface ThemeContextProps {
  mode: Mode;
  userSelectedMode?: Mode;
  setMode: (newMode?: Mode) => void | null;
}

const THEME_PREFRENCE_STORAGE_KEY = 'theme';

function getCurrentThemeModeFromStorage(): Mode {
  const themePrefrence = localStorage.getItem(THEME_PREFRENCE_STORAGE_KEY);
  if (!themePrefrence || ![THEME_LIGHT, THEME_DARK].includes(themePrefrence)) {
    // this means user has not set any explicit prefrence, so we use device theme
    const deviceTheme =
      !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? THEME_DARK
        : THEME_LIGHT;
    return deviceTheme;
  }
  return themePrefrence as Mode;
}

function getUserSelectedModeFromStorage(): Mode | undefined {
  const themePrefrence = localStorage.getItem(THEME_PREFRENCE_STORAGE_KEY);
  if ([THEME_LIGHT, THEME_DARK].includes(themePrefrence ?? '')) {
    return themePrefrence as Mode;
  }
}

const saveThemeModeToStorage = (newMode?: Mode) => {
  if (!newMode) {
    localStorage.removeItem(THEME_PREFRENCE_STORAGE_KEY);
    return;
  }
  localStorage.setItem(THEME_PREFRENCE_STORAGE_KEY, newMode);
};

export const ThemeContext = createContext<ThemeContextProps>({
  mode: getCurrentThemeModeFromStorage(),
  userSelectedMode: getUserSelectedModeFromStorage(),
  setMode: () => {
    /** default */
  },
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

export const useThemeMode = (): {
  mode: Mode;
  userSelectedMode?: Mode;
  setMode: (newMode?: Mode) => void;
} => {
  const [themeMode, setThemeMode] = useState<{
    mode: Mode;
    userSelectedMode?: Mode;
  }>({
    mode: getCurrentThemeModeFromStorage(),
    userSelectedMode: getUserSelectedModeFromStorage(),
  });

  if (themeMode.mode === 'dark' && !document.documentElement.classList.contains('dark')) {
    document.documentElement.classList.add('dark');
  } else if (
    themeMode.mode === 'light' &&
    document.documentElement.classList.contains('dark')
  ) {
    document.documentElement.classList.remove('dark');
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = ({ matches }: { matches: boolean }) => {
      setThemeMode((prev) => {
        if (!prev.userSelectedMode) {
          return {
            ...prev,
            mode: matches ? 'dark' : 'light',
          };
        }
        return prev;
      });
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [themeMode]);

  const setMode = (newMode?: Mode) => {
    saveThemeModeToStorage(newMode);
    setThemeMode({
      mode: getCurrentThemeModeFromStorage(),
      userSelectedMode: getUserSelectedModeFromStorage(),
    });
  };
  return { mode: themeMode.mode, userSelectedMode: themeMode.userSelectedMode, setMode };
};
