import './index.css';

import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';

import { router } from '@/routes';
import { ThemeProvider, useThemeMode } from '@/theme/ThemeContext';
import { useDocumentTitle } from '@/utils/useDocumentTitle';

function App() {
  const { setMode, userSelectedMode, mode } = useThemeMode();
  useDocumentTitle();
  return (
    <ThemeProvider value={{ setMode, mode, userSelectedMode }}>
      <Toaster theme={mode === 'dark' ? 'dark' : 'light'} />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

export default App;
