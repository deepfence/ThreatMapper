import { QueryClient, QueryClientProvider } from 'react-query';

import theme from './theme/default';
import { ThemeProvider, useThemeMode } from './theme/ThemeContext';

const queryClient = new QueryClient();

function App() {
  const { toggleMode } = useThemeMode(true);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={{ theme, toggleMode }}>
        <div>placeholder</div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
