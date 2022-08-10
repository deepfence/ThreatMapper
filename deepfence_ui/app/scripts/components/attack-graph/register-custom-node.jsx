/* eslint-disable no-nested-ternary */
import { registerNode } from '@antv/g6';
import VulnerabilityIcon from '../../../images/attack-graph-icons/attack_graph_vulnerability.svg';
import PostureIcon from '../../../images/attack-graph-icons/attack_graph_posture.svg';
import SecretIcon from '../../../images/attack-graph-icons/attack_graph_secret.svg';


function ellipseText(text, maxLength=20) {
  if (text.length >= maxLength) {
    return `${text.substring(0, maxLength - 3)}...`
  }
  return text;
}

registerNode(
  'attack-path-node',
  {
    draw(cfg, group) {
      const size =
        (typeof cfg?.size === 'number'
          ? cfg.size
          : Array.isArray(cfg?.size)
          ? cfg?.size[0]
          : cfg?.size) ?? 40;
      const mainOpacity = 0.9;
      // Add keyshape, which is the main shape which g6 considers
      // for edge connections etc.
      const keyShape = group?.addShape('circle', {
        attrs: {
          r: size / 2,
          fill: '#fff',
          stroke: '#fff',
          strokeOpacity: '0.6',
          opacity: 0.2,
          cursor: cfg?.nonInteractive ? 'default' : 'pointer',
        },
        draggable: true,
      });

      if (cfg?.img) {
        group
          ?.addShape('image', {
            attrs: {
              x: -size / 2 + 6,
              y: -size / 2 + 6,
              width: size - 12,
              height: size - 12,
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
          cfg.vulnerabilityCount >= 1000
            ? '999+'
            : String(cfg.vulnerabilityCount)
        }`;
        group?.addShape('rect', {
          attrs: {
            width: 14 + text.length * 4,
            height: 12,
            x: 8,
            y: -22,
            fill: '#ff4570',
            stroke: '#fff',
            strokeOpacity: 0.6,
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
            x: 19,
            y: -15.5,
            fontSize: 8,
            lineHeight: 10,
            fill: '#000',
            opacity: mainOpacity,
            textBaseline: 'middle',
            text,
            cursor: 'pointer',
            fontFamily: 'Source Sans Pro',
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
            fill: '#fd7e14',
            stroke: '#fff',
            strokeOpacity: 0.6,
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
            fontFamily: 'Source Sans Pro',
          },
          name: 'vuln-count',
          draggable: true,
        });
      }

      if (cfg.secretsCount) {
        const text = `${
          cfg.secretsCount >= 1000 ? '999+' : String(cfg.secretsCount)
        }`;
        group?.addShape('rect', {
          attrs: {
            width: 13 + text.length * 4,
            height: 12,
            x: 8,
            y: 10,
            fill: '#fa5252',
            stroke: '#fff',
            strokeOpacity: 0.6,
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
            img: SecretIcon,
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
            fontWeight: 600,
            fill: '#000',
            textBaseline: 'middle',
            text,
            opacity: mainOpacity,
            cursor: 'pointer',
            fontFamily: 'Source Sans Pro',
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
            fontFamily: 'Source Sans Pro',
            text: `${ellipseText(cfg.label)} ${cfg?.count > 0 ? `(${cfg?.count})` : ''}`,
            ...(cfg.labelCfg?.style ?? {}),
          },
          // must be assigned in G6 3.3 and later versions. it can be any value you want
          name: 'text-shape',
          // allow the shape to response the drag events
          draggable: true,
        });

        const bbox = label?.getBBox?.();
        const padding = cfg?.labelCfg?.background?.padding ?? [2, 4, 2, 4];
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
  'circle'
);
