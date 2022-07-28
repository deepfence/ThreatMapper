/* eslint-disable no-nested-ternary */
import { registerNode } from "@antv/g6";
import BugIcon from "../../../images/attack-graph-icons/attack_graph_bug.svg";
import ChecklistIcon from "../../../images/attack-graph-icons/attack_graph_checklist.svg";
import PasswordIcon from "../../../images/attack-graph-icons/attack_graph_password.svg";


registerNode('attack-path-node', {
  draw(cfg, group) {
    // console.log(cfg);

    const size = (typeof cfg?.size === 'number' ? cfg.size : (Array.isArray(cfg?.size) ? cfg?.size[0] : cfg?.size)) ?? 40;
    const mainOpacity = 0.9;
    // Add keyshape, which is the main shape which g6 considers
    // for edge connections etc.
    const keyShape = group?.addShape('circle', {
      attrs: {
        r: size / 2,
        fill: '#fff',
        stroke: '#fff',
        strokeOpacity: '0.4',
        opacity: 0.2,
        cursor: 'pointer'
      },
      draggable: true,
    });

    if (cfg?.img) {
      group?.addShape('image', {
        attrs: {
          x: (- size / 2) + 4,
          y: (- size/ 2) + 4,
          width: size - 8,
          height: size - 8,
          img: cfg.img,
          opacity: mainOpacity,
          cursor: 'pointer'
        },
        // must be assigned in G6 3.3 and later versions. it can be any value you want
        name: 'image-shape',
        draggable: true,
      }).setClip({
        attrs: {
          r: (size) / 2
        },
        type: 'circle',
      });
    }

    if (cfg.vulnerabilityCount) {
      const text = `${cfg.vulnerabilityCount >= 1000 ? '999+' : String(cfg.vulnerabilityCount)}`;
      group?.addShape('rect', {
        attrs: {
          width: 14 + (text.length * 4),
          height: 12,
          x: 8,
          y: -22,
          fill: '#ff4570',
          stroke: '#fff',
          strokeOpacity: 0.6,
          lineWidth: 0.3,
          radius: [6],
          opacity: mainOpacity,
          cursor: 'pointer'
        },
        draggable: true
      });

      group?.addShape('image', {
        attrs: {
          x: 10,
          y: -20,
          width: 8,
          height: 8,
          img: BugIcon,
          cursor: 'pointer'
        },
        // must be assigned in G6 3.3 and later versions. it can be any value you want
        name: 'compliance-image',
      });

      group?.addShape('text', {
        attrs: {
          fontFamily: 'monospace',
          x: 19,
          y: -16,
          fontSize: 8,
          lineHeight: 10,
          fontWeight: 600,
          fill: '#000',
          opacity: mainOpacity,
          textBaseline: 'middle',
          text,
          cursor: 'pointer'
        },
        name: 'vuln-count',
        draggable: true
      });
    }

    if (cfg.complianceCount) {
      const text = `${cfg.complianceCount >= 1000 ? '999+' : String(cfg.complianceCount)}`;
      group?.addShape('rect', {
        attrs: {
          width: 11 + (text.length * 4),
          height: 12,
          x: 15,
          y: -6,
          fill: '#fd7e14',
          stroke: '#fff',
          strokeOpacity: 0.6,
          lineWidth: 0.3,
          radius: [6],
          opacity: mainOpacity,
          cursor: 'pointer'
        },
        draggable: true
      });

      group?.addShape('image', {
        attrs: {
          x: 16,
          y: -3,
          width: 6,
          height: 6,
          img: ChecklistIcon,
          cursor: 'pointer'
        },
        // must be assigned in G6 3.3 and later versions. it can be any value you want
        name: 'compliance-image',
      });

      group?.addShape('text', {
        attrs: {
          fontFamily: 'monospace',
          x: 23,
          y: 0,
          fontSize: 8,
          opacity: mainOpacity,
          lineHeight: 10,
          fontWeight: 600,
          fill: '#000',
          textBaseline: 'middle',
          text,
          cursor: 'pointer'
        },
        name: 'vuln-count',
        draggable: true
      });
    }

    if (cfg.secretsCount) {
      const text = `${cfg.secretsCount >= 1000 ? '999+' : String(cfg.secretsCount)}`;
      group?.addShape('rect', {
        attrs: {
          width: 13 + (text.length * 4),
          height: 12,
          x: 8,
          y: 10,
          fill: '#fa5252',
          stroke: '#fff',
          strokeOpacity: 0.6,
          lineWidth: 0.3,
          radius: [6],
          opacity: mainOpacity,
          cursor: 'pointer'
        },
        draggable: true
      });

      group?.addShape('image', {
        attrs: {
          x: 9,
          y: 12,
          width: 8,
          height: 8,
          img: PasswordIcon,
          cursor: 'pointer'
        },
        // must be assigned in G6 3.3 and later versions. it can be any value you want
        name: 'compliance-image',
      });

      group?.addShape('text', {
        attrs: {
          fontFamily: 'monospace',
          x: 17,
          y: 16,
          fontSize: 8,
          lineHeight: 10,
          fontWeight: 600,
          fill: '#000',
          textBaseline: 'middle',
          text,
          opacity: mainOpacity,
          cursor: 'pointer'
        },
        name: 'vuln-count',
        draggable: true
      });
    }

    if (cfg?.label) {
      group?.addShape('text', {
        attrs: {
          x: 0, // center
          y: (size / 2) + 12,
          textAlign: 'center',
          textBaseline: 'middle',
          cursor: 'pointer',
          text: `${cfg.label} ${cfg?.count > 0 ? `(${cfg?.count})` : ''}`,
          ...(cfg.labelCfg?.style ?? {})
        },
        // must be assigned in G6 3.3 and later versions. it can be any value you want
        name: 'text-shape',
        // allow the shape to response the drag events
        draggable: true
      });
    }

    return keyShape;
  },
}, 'circle')
