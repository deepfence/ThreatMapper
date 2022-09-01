import { QueryClient, QueryClientProvider } from 'react-query';

import { Example } from './tests/components/Example';
import theme from './theme/default';
import { ThemeProvider, useThemeMode } from './theme/ThemeContext';

const queryClient = new QueryClient();

function App() {
  const { toggleMode } = useThemeMode(true);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={{ theme, toggleMode }}>
        <Example />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
