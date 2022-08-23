import { rest } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '../setup';
import { renderWithClient } from '../utils';
import { Example } from './Example';

describe('example component', () => {
  it('successful fetch query', async () => {
    server.use(
      rest.get('*', (req, res, ctx) => {
        return res(ctx.status(200));
      }),
    );

    const { findByText } = renderWithClient(<Example />);

    const element = await findByText(/query/i);

    expect(element).toBeDefined();
  });
});
