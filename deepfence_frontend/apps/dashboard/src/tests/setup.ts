import 'whatwg-fetch';

import { setupServer } from 'msw/node';
import ResizeObserver from 'resize-observer-polyfill';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { handlers } from '@/tests/utils';

// fix error of: ReferenceError: ResizeObserver is not defined
global.ResizeObserver = ResizeObserver;

export const server = setupServer(...handlers);

// Establish API mocking before all tests.
beforeAll(() => server.listen());
// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());
// Clean up after the tests are finished.
afterAll(() => server.close());
