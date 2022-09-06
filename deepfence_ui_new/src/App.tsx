import cx from 'classnames';
import { QueryClient, QueryClientProvider } from 'react-query';

import { Tooltip } from './components/tooltip/Tooltip';
import { Typography } from './components/typography/Typography';
import theme from './theme/default';
import { ThemeProvider, useThemeMode } from './theme/ThemeContext';

const queryClient = new QueryClient();

function App() {
  const { toggleMode } = useThemeMode(true);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={{ theme, toggleMode }}>
        <Tooltip content="test tooltip">
          <h1
            className={cx(
              Typography.size['xs'],
              Typography.weight.normal,
              'text-gray-900 text-9xl',
            )}
          >
            test
          </h1>
        </Tooltip>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
