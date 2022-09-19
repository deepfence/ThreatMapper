import { rest } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '../setup';
import { renderWithClient } from '../utils';
import { Example } from './Example';

describe.skip('example component', () => {
  it('display a loader', async () => {
    server.use(
      rest.get('*', (req, res, ctx) => {
        return res(ctx.status(200));
      }),
    );

    const { getByText } = renderWithClient(<Example />);
    expect(getByText(/Loading.../i)).toBeDefined();
  });
  it('get query data', async () => {
    server.use(
      rest.get('*', (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.json({
            userId: 1,
          }),
        );
      }),
    );

    const { findByText } = renderWithClient(<Example />);
    expect(await findByText(/userid: 1/i)).toBeDefined();
  });
});
