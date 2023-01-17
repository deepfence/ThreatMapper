import './index.css';

import { RouterProvider } from 'react-router-dom';

import { router } from '@/routes';
import { ThemeProvider, useThemeMode } from '@/theme/ThemeContext';

function App() {
  const { toggleMode, mode } = useThemeMode(true);
  return (
    <ThemeProvider value={{ toggleMode, mode }}>
      <div className="dark:bg-gray-900 bg-white">
        <RouterProvider router={router} />
      </div>
    </ThemeProvider>
  );
}

export default App;
