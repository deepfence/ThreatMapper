import './index.css';

import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';

import { router } from '@/routes';
import { ThemeProvider, useThemeMode } from '@/theme/ThemeContext';
import { useDocumentTitle } from '@/utils/useDocumentTitle';

function App() {
  const { toggleMode, mode } = useThemeMode(true);
  useDocumentTitle();
  return (
    <ThemeProvider value={{ toggleMode, mode }}>
      <Toaster theme={mode === 'dark' ? 'dark' : 'light'} />
      <div className="dark:bg-gray-900 bg-white">
        <RouterProvider router={router} />
      </div>
    </ThemeProvider>
  );
}

export default App;
