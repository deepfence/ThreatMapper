import classNames from 'classnames';
import { twMerge, extendTailwindMerge } from 'tailwind-merge';

// https://github.com/dcastil/tailwind-merge/issues/217
// TODO: make importing tailwind-preset work here and add keys from there
export const dfTwMerge: typeof twMerge = extendTailwindMerge({
  classGroups: {
    'font-size': [
      'text-h1',
      'text-h2',
      'text-h3',
      'text-h4',
      'text-h5',
      'text-h6',
      'text-p1',
      'text-p1a',
      'text-p2',
      'text-p3',
      'text-p4',
      'text-p4a',
      'text-p5',
      'text-p6',
      'text-p7',
      'text-p7a',
      'text-p8',
      'text-p9',
      'text-p10',
      'text-p11',
      'text-p12',
      'text-p13',
      'text-t1',
      'text-t2',
      'text-t3',
      'text-t4',
      'text-t5',
    ],
  },
});

export function cn(...args: classNames.ArgumentArray) {
  return dfTwMerge(classNames(args));
}
