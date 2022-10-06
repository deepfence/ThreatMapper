import { GraphOptions } from '@antv/g6-core';
import { G6 } from '@antv/graphin';
import { useState } from 'react';

import { COLORS, PALETTE } from './theme';

const graphModeEnableOptimize = (mode: string) => {
  return {
    type: mode,
    enableOptimize: true,
    sensitivity: 0.7,
  };
};

const LABEL_CFG = {
  position: 'bottom',
  offset: 12,
  style: {
    stroke: 'black',
    lineWidth: 0,
    fill: COLORS.LABEL,
    fontFamily: 'Source Sans Pro',
    fontSize: 20,
    background: {
      fill: '#ffffff',
      fillOpacity: 0.1,
      padding: [2, 4, 2, 4],
      radius: 2,
    },
  },
};

export type OptionsWithoutContainer = Omit<GraphOptions, 'container'>;

const DEFAULT_OPTIONS: OptionsWithoutContainer = {
  fitCenter: true,
  groupByTypes: false,
  defaultNode: {
    style: {
      // DO NOT set .fill here, as it breaks image nodes.
      stroke: COLORS.NODE_OUTLINE,
      lineWidth: 2,
      cursor: 'pointer',
    },
    labelCfg: {
      ...LABEL_CFG,
    },
  },
  defaultEdge: {
    type: 'cubic',
    size: 2,
    color: COLORS.EDGE,
    style: {
      opacity: 0.6,
      endArrow: {
        path: G6.Arrow.triangle(4, 6, 12),
        opacity: 0.6,
        strokeOpacity: 0.6,
        fillOpacity: 0.6,
        d: 16,
      },
    },
  },
  defaultCombo: {
    padding: 0,
    style: {
      fill: PALETTE.BLACK,
      fillOpacity: 0.6,
      stroke: COLORS.EDGE,
      strokeOpacity: 0.5,
    },
  },
  // state style
  nodeStateStyles: {
    active: {
      fill: PALETTE.OFF_WHITE,
    },
    inactive: {
      fill: 'red',
    },
  },
  edgeStateStyles: {
    active: {
      lineWidth: 3,
      stroke: COLORS.ACTIVE_EDGE,
      opacity: 0.6,
    },
  },
  comboStateStyles: {
    active: {},
    inactive: {},
  },
  modes: {
    default: [
      graphModeEnableOptimize('drag-canvas'),
      graphModeEnableOptimize('zoom-canvas'),
      {
        type: 'drag-node',
        onlyChangeComboSize: true,
      },
      'drag-combo',
    ],
  },
};
export const useGraphinOptions = (
  options: OptionsWithoutContainer = {},
  container?: HTMLDivElement,
) => {
  const width = container?.offsetWidth;
  const height = container?.offsetHeight;
  const [graphinOptions, setGraphinOptions] = useState(() => {
    const ops = {
      ...DEFAULT_OPTIONS,
      height,
      ...options,
    };
    if (width) {
      ops.width = width;
    }
    if (height) {
      ops.height = height;
    }
    return ops;
  });

  return {
    setOptions: setGraphinOptions,
    options: graphinOptions,
  };
};
