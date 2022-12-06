import './index.css';

import { HiChevronDoubleRight, HiHome } from 'react-icons/hi';
import { Breadcrumb, BreadcrumbLink } from 'ui-components';

import { Login } from './pages/Login';
import { ThemeProvider } from './theme/ThemeContext';

function App() {
  return (
    <ThemeProvider value={{}}>
      <Breadcrumb separator={<HiChevronDoubleRight />}>
        <BreadcrumbLink asChild icon={<HiHome />}>
          <a href="/test">Link One</a>
        </BreadcrumbLink>
        <BreadcrumbLink asChild>
          <a href="/test">a Two</a>
        </BreadcrumbLink>
      </Breadcrumb>
      <Login />
    </ThemeProvider>
  );
}

export default App;
