import { IGroup, NodeConfig, registerNode } from '@antv/g6';
import { colors, preset } from 'tailwind-preset';

import { GraphNodeInfo } from '@/api/generated';
import { Mode, THEME_LIGHT } from '@/theme/ThemeContext';
import { abbreviateNumber } from '@/utils/number';

export type ThreatGraphNodeModelConfig = NodeConfig & {
  id: string;
  label: string;
  nodeType?: string;
  issuesCount?: number;
  cloudId: 'NA' | string;
  nodes?: { [key: string]: GraphNodeInfo } | null;
  theme: Mode;
};

registerNode(
  'threat-graph-node',
  {
    afterDraw(_cfg, _group) {
      const cfg = _cfg as ThreatGraphNodeModelConfig;
      const isLightTheme = cfg.theme === THEME_LIGHT;
      const color = colors[isLightTheme ? 'variables' : 'darkVariables'].DEFAULT;
      const group = _group as IGroup;
      const mainOpacity = 0.9;
      if (cfg.issuesCount) {
        const text = `${abbreviateNumber(cfg.issuesCount)}`;
        group?.addShape('rect', {
          attrs: {
            width: 28 + text.length * 4,
            height: 16,
            x: 8,
            y: -22,
            fill: isLightTheme ? color['brand-error'] : color['btn-red'],
            lineWidth: 0.3,
            radius: [8],
            opacity: mainOpacity,
            cursor: 'pointer',
          },
          draggable: true,
        });
        group?.addShape('image', {
          attrs: {
            x: 12,
            y: -19,
            width: 10,
            height: 10,
            img: isLightTheme ? IssueIconLight : IssueIconDark,
            cursor: 'pointer',
          },
          // must be assigned in G6 3.3 and later versions. it can be any value you want
          name: 'issue-image',
        });
        group?.addShape('text', {
          attrs: {
            x: 24,
            y: -12.5,
            fontSize: 11,
            lineHeight: 16,
            fontWeight: 600,
            fill: color['text-text-inverse'],
            opacity: mainOpacity,
            textBaseline: 'middle',
            text,
            cursor: 'pointer',
            fontFamily: preset.theme.extend.fontFamily.body.join(','),
          },
          name: 'total-count',
          draggable: true,
        });
      }
    },
    getAnchorPoints() {
      return [
        [0.5, 0], // The center of the left border
        [0.5, 1], // The center of the right border
      ];
    },
  },
  'circle',
);

const IssueIconLight = `data:image/svg+xml;utf8,<svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M5.00011 0.583008C2.54551 0.583008 0.555664 2.57285 0.555664 5.02745C0.555664 7.48205 2.54551 9.4719 5.00011 9.4719C7.45471 9.4719 9.44455 7.48205 9.44455 5.02745C9.44455 3.84871 8.9763 2.71825 8.14281 1.88476C7.30931 1.05126 6.17885 0.583008 5.00011 0.583008ZM4.61122 2.44412C4.61122 2.22934 4.78533 2.05523 5.00011 2.05523C5.21489 2.05523 5.389 2.22934 5.389 2.44412V5.77745C5.389 5.99223 5.21489 6.16634 5.00011 6.16634C4.78533 6.16634 4.61122 5.99223 4.61122 5.77745V2.44412ZM4.50011 7.44412C4.50011 7.72026 4.72397 7.94412 5.00011 7.94412C5.27625 7.94412 5.50011 7.72026 5.50011 7.44412C5.50011 7.16798 5.27625 6.94412 5.00011 6.94412C4.72397 6.94412 4.50011 7.16798 4.50011 7.44412Z" fill="white"/>
</svg>`;
const IssueIconDark = `data:image/svg+xml;utf8,<svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M5.00011 0.583008C2.54551 0.583008 0.555664 2.57285 0.555664 5.02745C0.555664 7.48205 2.54551 9.4719 5.00011 9.4719C7.45471 9.4719 9.44455 7.48205 9.44455 5.02745C9.44455 3.84871 8.9763 2.71825 8.14281 1.88476C7.30931 1.05126 6.17885 0.583008 5.00011 0.583008ZM4.61122 2.44412C4.61122 2.22934 4.78533 2.05523 5.00011 2.05523C5.21489 2.05523 5.389 2.22934 5.389 2.44412V5.77745C5.389 5.99223 5.21489 6.16634 5.00011 6.16634C4.78533 6.16634 4.61122 5.99223 4.61122 5.77745V2.44412ZM4.50011 7.44412C4.50011 7.72026 4.72397 7.94412 5.00011 7.94412C5.27625 7.94412 5.50011 7.72026 5.50011 7.44412C5.50011 7.16798 5.27625 6.94412 5.00011 6.94412C4.72397 6.94412 4.50011 7.16798 4.50011 7.44412Z" fill="black"/>
</svg>`;
