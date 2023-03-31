import { IGroup, NodeConfig, registerNode } from '@antv/g6';
import { truncate } from 'lodash-es';

import { GraphNodeInfo } from '@/api/generated';

export type ThreatGraphNodeModelConfig = NodeConfig & {
  id: string;
  label: string;
  complianceCount: number;
  count: number;
  nodeType: string;
  secretsCount: number;
  vulnerabilityCount: number;
  img: string;
  nonInteractive: boolean;
  nodes?: { [key: string]: GraphNodeInfo } | null;
};

registerNode(
  'threat-graph-node',
  {
    draw(_cfg, _group) {
      const cfg = _cfg as ThreatGraphNodeModelConfig;
      const group = _group as IGroup;
      const size =
        (typeof cfg?.size === 'number'
          ? cfg.size
          : Array.isArray(cfg?.size)
          ? cfg?.size[0]
          : cfg?.size) ?? 40;
      const mainOpacity = 0.9;
      // Add keyshape, which is the main shape which g6 considers
      // for edge connections etc.
      const keyShape = group.addShape('circle', {
        attrs: {
          r: size / 2,
          cursor: cfg?.nonInteractive ? 'default' : 'pointer',
        },
        draggable: true,
      });

      if (cfg?.img) {
        group
          ?.addShape('image', {
            attrs: {
              x: -size / 2,
              y: -size / 2,
              width: size,
              height: size,
              img: cfg.img,
              opacity: mainOpacity,
              cursor: cfg?.nonInteractive ? 'default' : 'pointer',
            },
            // must be assigned in G6 3.3 and later versions. it can be any value you want
            name: 'image-shape',
            draggable: true,
          })
          .setClip({
            attrs: {
              r: size / 2,
            },
            type: 'circle',
          });
      }

      if (cfg.vulnerabilityCount) {
        const text = `${
          cfg.vulnerabilityCount >= 1000 ? '999+' : String(cfg.vulnerabilityCount)
        }`;
        group?.addShape('rect', {
          attrs: {
            width: 14 + text.length * 4,
            height: 12,
            x: 8,
            y: -22,
            fill: '#F05252',
            lineWidth: 0.3,
            radius: [6],
            opacity: mainOpacity,
            cursor: 'pointer',
          },
          draggable: true,
        });

        group?.addShape('image', {
          attrs: {
            x: 10,
            y: -20,
            width: 8,
            height: 8,
            img: VulnerabilityIcon,
            cursor: 'pointer',
          },
          // must be assigned in G6 3.3 and later versions. it can be any value you want
          name: 'compliance-image',
        });

        group?.addShape('text', {
          attrs: {
            x: 18,
            y: -15.5,
            fontSize: 8,
            lineHeight: 10,
            fill: '#000',
            opacity: mainOpacity,
            textBaseline: 'middle',
            text,
            cursor: 'pointer',
          },
          name: 'vuln-count',
          draggable: true,
        });
      }

      if (cfg.complianceCount) {
        const text = `${
          cfg.complianceCount >= 1000 ? '999+' : String(cfg.complianceCount)
        }`;
        group?.addShape('rect', {
          attrs: {
            width: 11 + text.length * 4,
            height: 12,
            x: 15,
            y: -6,
            fill: '#F05252',
            lineWidth: 0.3,
            radius: [6],
            opacity: mainOpacity,
            cursor: 'pointer',
          },
          draggable: true,
        });

        group?.addShape('image', {
          attrs: {
            x: 16,
            y: -3,
            width: 6,
            height: 6,
            img: PostureIcon,
            cursor: 'pointer',
          },
          // must be assigned in G6 3.3 and later versions. it can be any value you want
          name: 'compliance-image',
        });

        group?.addShape('text', {
          attrs: {
            x: 23,
            y: 0.5,
            fontSize: 8,
            opacity: mainOpacity,
            lineHeight: 10,
            fill: '#000',
            textBaseline: 'middle',
            text,
            cursor: 'pointer',
          },
          name: 'vuln-count',
          draggable: true,
        });
      }

      if (cfg.secretsCount) {
        const text = `${cfg.secretsCount >= 1000 ? '999+' : String(cfg.secretsCount)}`;
        group?.addShape('rect', {
          attrs: {
            width: 13 + text.length * 4,
            height: 12,
            x: 8,
            y: 10,
            fill: '#F05252',
            lineWidth: 0.3,
            radius: [6],
            opacity: mainOpacity,
            cursor: 'pointer',
          },
          draggable: true,
        });

        group?.addShape('image', {
          attrs: {
            x: 9,
            y: 12,
            width: 8,
            height: 8,
            img: SecretsIcon,
            cursor: 'pointer',
          },
          // must be assigned in G6 3.3 and later versions. it can be any value you want
          name: 'compliance-image',
        });

        group?.addShape('text', {
          attrs: {
            x: 17,
            y: 16.5,
            fontSize: 8,
            lineHeight: 10,
            fill: '#000',
            textBaseline: 'middle',
            text,
            opacity: mainOpacity,
            cursor: 'pointer',
          },
          name: 'vuln-count',
          draggable: true,
        });
      }

      if (cfg?.label) {
        const label = group?.addShape('text', {
          attrs: {
            x: 0, // center
            y: size / 2 + 12,
            textAlign: 'center',
            textBaseline: 'middle',
            cursor: 'pointer',
            text: `${truncate(cfg.label, { length: 20 })} ${
              cfg.count > 0 ? `(${cfg.count})` : ''
            }`,
            ...(cfg.labelCfg?.style ?? {}),
          },
          // must be assigned in G6 3.3 and later versions. it can be any value you want
          name: 'text-shape',
          // allow the shape to response the drag events
          draggable: true,
        });

        const bbox = label?.getBBox?.();
        const padding = (cfg?.labelCfg as any)?.background?.padding ?? [2, 4, 2, 4];
        const backgroundWidth = bbox?.width + padding[1] + padding[3];
        const backgroundHeight = bbox?.height + padding[0] + padding[2];

        group?.addShape?.('rect', {
          name: 'text-bg-shape',
          attrs: {
            x: bbox.minX - padding[3],
            y: bbox.minY - padding[0],
            fill: '#ffffff',
            fillOpacity: 0.1,
            padding,
            radius: 2,
            width: backgroundWidth,
            height: backgroundHeight,
          },
        });
      }

      return keyShape;
    },
  },
  'circle',
);

const VulnerabilityIcon = `data:image/svg+xml;utf8,<svg width="100%" height="100%" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M27.8 10.25C23.825 11.4875 21.0875 13.8875 19.325 17.675C18.2375 20.0375 17.825 23.9375 18.425 26.075C18.7625 27.3125 18.725 27.5 18.2 27.5C17.1125 27.5 13.8875 29.225 12.275 30.6125C11.45 31.3625 10.175 33.0125 9.50001 34.325C8.45001 36.3125 8.18751 37.175 8.07501 39.6875C7.88751 43.0625 8.48751 45.875 9.35001 45.875C9.80001 45.875 9.83751 45.4625 9.65001 43.5125C9.20001 39.1625 11 35.75 14.75 33.6875C18.5375 31.625 23.4125 32.4875 26.5625 35.75C27.4625 36.6875 27.725 36.7625 28.475 36.425C29.1125 36.125 29.375 35.7125 29.375 34.9625C29.375 34.2875 29.75 33.6125 30.5375 32.975C31.3625 32.2625 31.6625 31.7375 31.55 31.025C31.4375 30.1625 31.175 29.9375 29.675 29.5625C23.375 27.9875 20.375 21.0875 23.6 15.6125C24.6875 13.775 26.225 12.4625 28.7375 11.4125C30.3875 10.7 30.875 10.1375 30.2375 9.76249C30.05 9.64999 29 9.87499 27.8 10.25Z"
    fill="currentColor"
  />
  <path
    d="M33.725 9.7625C33.2 10.2875 33.6125 10.7 35.2625 11.4125C39.125 13.0625 41.2625 15.725 41.6375 19.3625C42.125 24.125 39.05 28.3625 34.25 29.6C32.825 29.9375 32.525 30.1625 32.45 31.025C32.3375 31.7375 32.6375 32.2625 33.4625 32.975C34.25 33.6125 34.625 34.2875 34.625 34.9625C34.625 35.7125 34.8875 36.125 35.525 36.425C36.275 36.7625 36.5375 36.6875 37.4375 35.75C39.3125 33.8 42.05 32.6 44.75 32.6C46.8125 32.5625 47.525 32.75 49.25 33.725C53.075 35.9 54.8 39.1625 54.35 43.5125C54.1625 45.4625 54.2 45.875 54.65 45.875C55.5125 45.875 56.1125 43.0625 55.925 39.6875C55.8125 37.175 55.55 36.3125 54.5 34.325C53.825 33.0125 52.55 31.3625 51.725 30.6125C50.1125 29.225 46.8875 27.5 45.8 27.5C45.275 27.5 45.2375 27.3125 45.575 26.075C46.175 23.9375 45.7625 20.0375 44.675 17.675C43.5125 15.1625 41.4125 12.7625 39.35 11.5625C37.625 10.5875 34.0625 9.425 33.725 9.7625Z"
    fill="currentColor"
  />
  <path
    d="M28.5125 21.125C27.7625 21.3125 26.45 21.8375 25.625 22.25C24.125 23 24.125 23.0375 24.6875 24.05C24.9875 24.6125 25.55 25.4375 25.9625 25.8875L26.675 26.7125L28.775 26C29.9 25.5875 31.3625 25.25 32 25.25C32.6375 25.25 34.1 25.5875 35.225 26L37.325 26.7125L38.0375 25.8875C38.45 25.4375 39.0125 24.575 39.35 24.0125L39.9125 22.9625L37.8125 22.025C35.45 20.9375 30.9875 20.525 28.5125 21.125Z"
    fill="currentColor"
  />
  <path
    d="M17.75 35.4875C17.75 37.7375 18.65 40.5125 20.0375 42.65C21.3875 44.675 24.9875 47.5625 25.6625 47.1875C25.8875 47.0375 26.4125 46.1375 26.825 45.2L27.575 43.5125L25.85 42.05C23.825 40.325 22.8125 38.525 22.4375 36.05C22.2125 34.5125 22.0625 34.2875 21.05 34.1C20.4125 33.9875 19.4375 33.875 18.8375 33.875C17.825 33.875 17.75 33.95 17.75 35.4875Z"
    fill="currentColor"
  />
  <path
    d="M42.65 34.1375C42.0125 34.25 41.7875 34.6625 41.5625 36.05C41.1875 38.525 40.175 40.325 38.15 42.05L36.425 43.5125L37.175 45.2C37.5875 46.1375 38.1125 47.0375 38.3375 47.1875C39.0125 47.5625 42.6125 44.675 43.9625 42.65C45.35 40.5125 46.25 37.7375 46.25 35.4875V33.875L44.8625 33.9125C44.075 33.95 43.0625 34.0625 42.65 34.1375Z"
    fill="currentColor"
  />
  <path
    d="M28.8125 37.0625C28.175 37.5875 28.1375 37.775 28.55 39.3125C29.4875 42.875 28.7 46.175 26.3 48.575C24.2375 50.6375 22.2125 51.5 19.325 51.5C16.8125 51.5 14.9375 50.9 13.025 49.4375C10.55 47.525 10.175 48.875 12.575 50.9375C17.6 55.25 25.85 55.325 30.65 51.125L32 49.925L33.35 51.125C38.15 55.325 46.4 55.25 51.425 50.9375C53.825 48.875 53.45 47.525 50.975 49.4375C49.0625 50.9 47.1875 51.5 44.675 51.5C41.7875 51.5 39.7625 50.6375 37.7 48.575C35.1875 46.0625 34.625 43.4 35.5625 38.5625C35.8625 37.1375 34.7 36.2375 33.4625 36.9125C32.7125 37.2875 31.325 37.25 30.125 36.7625C29.825 36.6125 29.225 36.7625 28.8125 37.0625Z"
    fill="currentColor"
  />
</svg>`;

const SecretsIcon = `data:image/svg+xml;utf8,<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
<path d="M33.0083 47.8719H33.5083V47.3719V41.5869C34.3431 41.0017 34.9326 40.0604 34.9326 38.9351C34.9326 37.0971 33.423 35.6228 31.584 35.6228C29.7384 35.6228 28.2355 37.1009 28.2355 38.9351C28.2355 40.0622 28.822 41.0044 29.6597 41.5902V47.3719V47.8719H30.1597H33.0083ZM50.5 51.7816V31.8706C50.5 29.4643 48.6716 27.4888 46.3269 27.199V22.0614C46.3269 14.0258 39.7076 7.5 31.584 7.5C23.4605 7.5 16.8412 14.0258 16.8412 22.0614V27.1714C14.4158 27.3875 12.5 29.4072 12.5 31.8706V51.7816C12.5 54.3895 14.647 56.5 17.2728 56.5H45.7272C48.353 56.5 50.5 54.3895 50.5 51.7816ZM41.5 27.1522H21.5V22.0614C21.5 19.0803 22.5298 16.7034 24.2771 15.0694C26.0281 13.4319 28.5438 12.5 31.584 12.5C34.6238 12.5 37.0949 13.4315 38.8028 15.0655C40.5081 16.6971 41.5 19.0743 41.5 22.0614V27.1522ZM17.2728 31.5H45.8084C45.8908 31.5062 45.9532 31.5121 46.0009 31.518C46.0017 31.5657 46.0013 31.6203 46.0008 31.6885C46.0004 31.7404 46 31.8001 46 31.8706V51C46 51.235 45.8891 51.488 45.6896 51.6881C45.4904 51.8879 45.2378 52 45 52H18C17.7622 52 17.5096 51.8879 17.3104 51.6881C17.1109 51.488 17 51.235 17 51V31.8706V31.865C17 31.7001 17 31.5897 17.0045 31.5072C17.0658 31.5026 17.1514 31.5 17.2728 31.5Z" fill="currentColor" stroke="black"/>
</svg>`;

const PostureIcon = `data:image/svg+xml;utf8,<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
<path d="M53.1765 53V50H50.3529V32H53.1765V29H44.7059V32H47.5294V50H39.0588V32H41.8824V29H33.4118V32H36.2353V50H27.7647V32H30.5882V29H22.1176V32H24.9412V50H16.4706V32H19.2941V29H10.8235V32H13.6471V50H10.8235V53H8V56H56V53H53.1765Z" fill="currentColor"/>
<path d="M30.5882 8H33.4118L56 23V26H8V23L30.5882 8Z" fill="currentColor"/>
</svg>`;
