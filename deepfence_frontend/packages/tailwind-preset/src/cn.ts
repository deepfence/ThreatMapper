import classNames from 'classnames';
import { twMerge, extendTailwindMerge } from 'tailwind-merge';
import { preset } from './preset';

// https://github.com/dcastil/tailwind-merge/issues/217
export const dfTwMerge: typeof twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': Object.keys(preset.theme.extend.fontSize).map((key) => {
        return `text-${key}`;
      }),
    },
  },
});

export function cn(...args: classNames.ArgumentArray) {
  return dfTwMerge(classNames(args));
}
