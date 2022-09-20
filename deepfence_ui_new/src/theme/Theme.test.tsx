import '@testing-library/jest-dom';

import { fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { beforeEach, describe, it } from 'vitest';

import Button from '../components/button/Button';
import { renderWithClient } from '../tests/utils';
import theme from '../theme/default';
import {
  THEME_DARK,
  THEME_LIGHT,
  ThemeProvider,
  useThemeMode,
} from '../theme/ThemeContext';

const queryClient = new QueryClient();

const App = () => {
  const { toggleMode } = useThemeMode(true);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={{ theme, toggleMode }}>
        <Button onClick={() => toggleMode?.()} data-testid="button-theme-toggle">
          Change Theme
        </Button>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  localStorage.clear();
});

describe('THEME', () => {
  it('system preference theme applied', () => {
    let themeMode = '';
    const userPreferenceDark =
      !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (userPreferenceDark) {
      themeMode = THEME_DARK;
    }
    renderWithClient(<App />);
    const html = document.getElementsByTagName('html');
    const theme = html.item(0)?.className;
    expect(theme).toEqual(themeMode);
  });
  it('user preference theme applied, can toggle change theme', () => {
    localStorage.setItem('theme', THEME_LIGHT);
    const { getByTestId } = renderWithClient(<App />);

    let html = document.getElementsByTagName('html');
    let theme = html.item(0)?.className;

    expect(theme).toEqual(''); // tailwind ignore light class for light mode theme

    const btn = getByTestId('button-theme-toggle');
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);

    html = document.getElementsByTagName('html');
    theme = html.item(0)?.className;
    expect(theme).toEqual(THEME_DARK);
  });
});
