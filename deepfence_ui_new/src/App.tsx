import { QueryClient, QueryClientProvider } from 'react-query';

import { Example } from './tests/components/Example';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Example />
    </QueryClientProvider>
  );
}

export default App;
