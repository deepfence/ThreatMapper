import './index.css';

import { RouterProvider } from 'react-router-dom';

import { LazyLayout } from './components/lazy/LazyLayout';
import { router } from './routes';
import { ThemeProvider, useThemeMode } from './theme/ThemeContext';

function App() {
  const { toggleMode } = useThemeMode(true);

  return (
    <ThemeProvider value={{ toggleMode }}>
      <LazyLayout>
        <div className="h-screen dark:bg-gray-900 bg-gray-200 relative">
          <RouterProvider router={router} />
        </div>
      </LazyLayout>
    </ThemeProvider>
  );
}

export default App;
