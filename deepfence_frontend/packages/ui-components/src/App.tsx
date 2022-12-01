import cx from 'classnames';

import { Tooltip } from '@/components/tooltip/Tooltip';
import { Typography } from '@/components/typography/Typography';
import { ThemeProvider, useThemeMode } from '@/theme/ThemeContext';

function App() {
  const { toggleMode } = useThemeMode(true);

  return (
    <ThemeProvider value={{ toggleMode }}>
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
  );
}

export default App;
