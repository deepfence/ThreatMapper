import ResizeObserver from 'resize-observer-polyfill';

// fix error of: ReferenceError: ResizeObserver is not defined
globalThis.ResizeObserver = ResizeObserver;
