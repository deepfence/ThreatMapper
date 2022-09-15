import '@testing-library/jest-dom';

import { QueryClient, QueryClientProvider } from 'react-query';
import { beforeEach, describe, it } from 'vitest';
import { Checkbox } from '../components/checkbox/Checkbox';

import { renderWithClient } from '../tests/utils';
import theme from '../theme/default';
import {
  ThemeProvider,
  THEME_DARK,
  THEME_LIGHT,
  useThemeMode,
} from '../theme/ThemeContext';

const queryClient = new QueryClient();

const App = () => {
  const { toggleMode } = useThemeMode(true);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={{ theme, toggleMode }}>
        <Checkbox label="Check" id="test" />
      </ThemeProvider>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  localStorage.clear();
});

describe('THEME', () => {
  it('check a component has system theme style', () => {
    let aClassStyle = 'radix-state-unchecked:bg-gray-50';
    const userPreferenceDark =
      !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (userPreferenceDark) {
      aClassStyle = 'radix-state-unchecked:dark:bg-gray-700';
    }
    const { getByTestId } = renderWithClient(<App />);
    const checkbox = getByTestId('checkbox-test');
    expect(checkbox).toBeDefined();
    expect(checkbox).toHaveClass(aClassStyle);
  });
  it('check a component has light theme style', () => {
    localStorage.setItem('theme', THEME_LIGHT);
    const { getByTestId } = renderWithClient(<App />);
    const checkbox = getByTestId('checkbox-test');
    expect(checkbox).toBeDefined();
    expect(checkbox).toHaveClass('radix-state-unchecked:bg-gray-50');
  });

  it('check component has dark theme style', () => {
    localStorage.setItem('theme', THEME_DARK);
    const { getByTestId: getByTestId2 } = renderWithClient(<App />);
    const checkboxDark = getByTestId2('checkbox-test');
    expect(checkboxDark).toHaveClass('radix-state-unchecked:dark:bg-gray-700');
  });
});
