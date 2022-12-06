import './index.css';

import { RouterProvider } from 'react-router-dom';

import { router } from './routes';
import { ThemeProvider } from './theme/ThemeContext';

function App() {
  return (
    <ThemeProvider value={{}}>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

export default App;
