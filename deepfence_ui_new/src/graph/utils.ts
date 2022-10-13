/**
 * General Graph utilities
 */

import { GraphinData, IUserEdge, IUserNode, Utils } from '@antv/graphin';
import { Combo } from '@antv/graphin/lib/typings/type';

type GraphinItemType = IUserNode | IUserEdge | Combo[] | undefined | null;

// TODO：build-in Graphin.Utils
export const update = (data: GraphinData, type: 'node' | 'edge' = 'node') => {
  const items: GraphinItemType[] = data[`${type}s`];
  return {
    set: (id: string, model: any) => {
      const newItems: GraphinItemType[] = [];
      items.forEach((item: GraphinItemType) => {
        if ((item as IUserNode | IUserEdge)?.id === id) {
          const mergedItem = Utils.deepMix({}, item, model);
          newItems.push(mergedItem);
        } else {
          newItems.push(item);
        }
      });
      return {
        ...data,
        [`${type}s`]: newItems,
      };
    },
  };
};

export function arrayTransformByFunction<T>(
  arrays: T[],
  fn: (element: T) => T | null,
): T[] {
  return arrays.reduce((acc: T[], element: T) => {
    const result = fn(element);
    if (result) {
      acc.push(result);
    }
    return acc;
  }, []);
}

export const basename = (path: string) => {
  const i = path.lastIndexOf('/');
  if (i >= 0) {
    return path.substring(i + 1);
  }
  return path;
};

export const ellipsize = (text: string, n: number) => {
  if (text.length <= n) {
    return text;
  }

  return text.substring(0, n - 3) + '...';
};
