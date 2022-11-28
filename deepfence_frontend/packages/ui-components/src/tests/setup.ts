import ResizeObserver from 'resize-observer-polyfill';

// fix error of: ReferenceError: ResizeObserver is not defined
global.ResizeObserver = ResizeObserver;
