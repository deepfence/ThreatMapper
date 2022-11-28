import './index.css';

import { Login } from './pages/Login';
import { ThemeProvider } from './theme/ThemeContext';

function App() {
  return (
    <ThemeProvider value={{}}>
      <Login />
    </ThemeProvider>
  );
}

export default App;
