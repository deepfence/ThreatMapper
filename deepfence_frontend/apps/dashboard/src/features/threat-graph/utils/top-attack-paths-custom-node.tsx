import { IGroup, NodeConfig, registerNode } from '@antv/g6';
import { preset } from 'tailwind-preset';

import { abbreviateNumber } from '@/utils/number';

export type TopAttackPathsNodeModelConfig = NodeConfig & {
  id: string;
  label: string;
  cve_id: string[];
  cve_attack_vector: string;
  ports: string[];
  direction: 'LR' | 'TB';
};

registerNode(
  'top-attack-paths-graph-node',
  {
    afterDraw(_cfg, _group) {
      const cfg = _cfg as TopAttackPathsNodeModelConfig;
      const group = _group as IGroup;
      const mainOpacity = 0.9;
      if (cfg.cve_id.length) {
        const text = `${abbreviateNumber(cfg.cve_id.length)}`;
        group?.addShape('rect', {
          attrs: {
            width: 26 + text.length * 4,
            height: 16,
            x: 8,
            y: -22,
            fill: '#E0516D',
            lineWidth: 0.3,
            radius: [8],
            opacity: mainOpacity,
            cursor: 'pointer',
          },
          draggable: true,
        });
        group?.addShape('image', {
          attrs: {
            x: 10,
            y: -20,
            width: 12,
            height: 12,
            img: VulnerabilityIcon,
          },
          // must be assigned in G6 3.3 and later versions. it can be any value you want
          name: 'issue-image',
        });
        group?.addShape('text', {
          attrs: {
            x: 24,
            y: -13,
            fontSize: 11,
            lineHeight: 16,
            fontWeight: 600,
            fill: '#000',
            opacity: mainOpacity,
            textBaseline: 'middle',
            text,
            fontFamily: preset.theme.extend.fontFamily.body.join(','),
          },
          name: 'total-count',
          draggable: true,
        });
      }
    },
    getAnchorPoints(_cfg) {
      const cfg = _cfg as TopAttackPathsNodeModelConfig;
      if (cfg.direction === 'LR') {
        return [
          [0, 0.5],
          [1, 0.5],
        ];
      }
      return [
        [0.5, 0], // The center of the left border
        [0.5, 1], // The center of the right border
      ];
    },
  },
  'circle',
);

const VulnerabilityIcon = `data:image/svg+xml;utf8,<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<g>
<path fill-rule="evenodd" clip-rule="evenodd" d="M10.1102 8.51367L6.86356 2.53367C6.68846 2.21196 6.3515 2.01172 5.98523 2.01172C5.61895 2.01172 5.28199 2.21196 5.10689 2.53367L1.85689 8.51367C1.68379 8.82438 1.68875 9.20366 1.86993 9.50974C2.0511 9.81581 2.38122 10.0026 2.73689 10.0003H9.23023C9.58288 10.0007 9.90964 9.81521 10.0902 9.51226C10.2707 9.20932 10.2783 8.83369 10.1102 8.52367V8.51367ZM5.48689 4.247C5.48689 3.97086 5.71075 3.747 5.98689 3.747C6.26304 3.747 6.48689 3.97086 6.48689 4.247V6.54367C6.48689 6.81981 6.26304 7.04367 5.98689 7.04367C5.71075 7.04367 5.48689 6.81981 5.48689 6.54367V4.247ZM5.42689 8.177C5.42689 8.49365 5.68358 8.75034 6.00023 8.75034C6.31687 8.75034 6.57356 8.49365 6.57356 8.177C6.57356 7.86036 6.31687 7.60367 6.00023 7.60367C5.68358 7.60367 5.42689 7.86036 5.42689 8.177Z" fill="black"/>
</g>
</svg>`;
