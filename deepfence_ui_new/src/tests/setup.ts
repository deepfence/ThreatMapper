import ResizeObserver from 'resize-observer-polyfill';
import 'whatwg-fetch';

import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';

// fix error of: ReferenceError: ResizeObserver is not defined
global.ResizeObserver = ResizeObserver;

import { handlers } from './utils';

export const server = setupServer(...handlers);

// Establish API mocking before all tests.
beforeAll(() => server.listen());
// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());
// Clean up after the tests are finished.
afterAll(() => server.close());
