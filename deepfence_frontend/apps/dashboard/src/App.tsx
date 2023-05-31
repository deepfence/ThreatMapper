import './index.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';

import { queryClient } from '@/queries/client';
import { router } from '@/routes';
import { ThemeProvider, useThemeMode } from '@/theme/ThemeContext';
import { useDocumentTitle } from '@/utils/useDocumentTitle';

function App() {
  const { setMode, userSelectedMode, mode } = useThemeMode();
  useDocumentTitle();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={{ setMode, mode, userSelectedMode }}>
        <Toaster theme={mode === 'dark' ? 'dark' : 'light'} />
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
