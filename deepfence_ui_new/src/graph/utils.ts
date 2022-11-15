/**
 * General Graph utilities
 */

import { ICombo } from '@antv/g6';

import { INode } from './types';

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

export const debounce = <T extends (...params: any[]) => void>(cb: T, ms = 500) => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (...args: any) => {
    let cb_args = args;
    const doCall = () => {
      cb(...cb_args);
      cb_args = null;
    };

    if (timer === null) {
      timer = setTimeout(() => {
        timer = null;

        if (cb_args !== null) {
          doCall();
        }
      }, ms);
    }
  };
};

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

export const nodeToFront = (node: ICombo | INode) => {
  node.toFront();
  for (const edge of node.getEdges()) {
    edge.toFront();
  }

  if (node.getType() !== 'combo') {
    return;
  }

  const children = (node as ICombo).getChildren();
  for (const node of children.nodes) {
    nodeToFront(node);
  }
};
