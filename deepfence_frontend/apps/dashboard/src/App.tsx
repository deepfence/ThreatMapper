import './index.css';

import { RouterProvider } from 'react-router-dom';

import { router } from './router/route';
import { ThemeProvider, useThemeMode } from './theme/ThemeContext';

function App() {
  const { toggleMode } = useThemeMode(true);

  return (
    <ThemeProvider value={{ toggleMode }}>
      <div className="h-screen dark:bg-gray-900 bg-gray-200">
        <RouterProvider router={router} />
      </div>
    </ThemeProvider>
  );
}

export default App;
