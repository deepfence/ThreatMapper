import { useMachine } from '@xstate/react';
import { useState } from 'react';
import { createMachine } from 'xstate';

const createDiffData = (
  previousData: { [key: string]: any },
  data: { [key: string]: any },
) => {
  const diff = {
    add: [],
    delete: [],
    update: [],
  };
  const nodes = new Map();
  const prevNodes = new Map();
  data.nodes.forEach((node) => {
    nodes.set(node.id, node);
  });
  previousData.nodes.forEach((node) => {
    prevNodes.set(node.id, node);
  });
  prevNodes.forEach((prevNode, id) => {
    if (nodes.has(id)) {
      diff.update.push(prevNode);
    } else {
      diff.delete.push(prevNode);
    }
  });
  nodes.forEach((node, id) => {
    if (!prevNodes.has(id)) {
      diff.add.push(node);
    }
  });
  console.log('diff is', {
    nodes: diff,
    edges: data.edges,
  });
  return {
    nodes: diff,
    edges: data.edges,
  };
};

const machine = createMachine(
  {
    id: 'topology',
    initial: 'getTopologyData',
    states: {
      getTopologyData: {
        invoke: {
          src: 'fetchTopologyData',
          onDone: [
            {
              actions: 'saveTopologyData',
              target: 'showTopologyGraph',
            },
          ],
          onError: [
            {
              target: 'processError',
            },
          ],
        },
      },
      showTopologyGraph: {
        on: {
          SET_SELECTED_NODE: {
            actions: 'saveSelectedNode',
            target: 'getNodeDelta',
          },
        },
      },
      getNodeDelta: {
        invoke: {
          src: 'fetchNodeDelta',
          onDone: [
            {
              actions: 'saveDelta',
              target: 'showTopologyGraph',
            },
          ],
          onError: [
            {
              target: 'processError',
            },
          ],
        },
      },
      processError: {},
    },
    context: {
      data: {},
      selectedNode: {},
      previousData: {
        nodes: [],
        edges: [],
      },
      diff: {},
    },
  },
  {
    actions: {
      saveTopologyData: (context, event) => {
        // console.log('saveTopologyData', event.data);
        context.data = event.data;
        context.diff = createDiffData(context.previousData, event.data);
      },
      saveSelectedNode: (context, event) => {
        context.selectedNode = {
          ...context.selectedNode,
          [event.item]: {},
        };
      },
      saveDelta: (context, event) => {
        // console.log(context, 'selected node:', event.data);
        context.previousData = context.data;
        context.data = event.data;
        context.diff = createDiffData(context.previousData, event.data);
      },
    },
    services: {
      fetchTopologyData: (context, event) => {
        return new Promise((res) => {
          res({
            nodes: [
              {
                id: 'in-theinternet',
                label: 'The Internet',
                labelMinor: 'Inbound connections',
                rank: 'in-theinternet',
                shape: 'cloud',
                pseudo: true,
                adjacency: [
                  'aws;\u003ccloud_provider\u003e',
                  'azure;\u003ccloud_provider\u003e',
                  'digital_ocean;\u003ccloud_provider\u003e',
                ],
                immediate_parent_id: '',
              },
              {
                id: 'digital_ocean;\u003ccloud_provider\u003e',
                label: 'DigitalOcean',
                labelMinor: '',
                rank: 'digital_ocean',
                shape: 'digital_ocean',
                metadata: [
                  {
                    id: 'name',
                    label: 'Name',
                    value: 'digital_ocean',
                    priority: 1.0,
                  },
                  {
                    id: 'label',
                    label: 'Label',
                    value: 'DigitalOcean',
                    priority: 2.0,
                  },
                ],
                adjacency: ['digital_ocean;\u003ccloud_provider\u003e'],
                immediate_parent_id: '',
              },
              {
                id: 'out-theinternet',
                label: 'The Internet',
                labelMinor: 'Outbound connections',
                rank: 'out-theinternet',
                shape: 'cloud',
                pseudo: true,
                immediate_parent_id: '',
              },
            ],
            edges: {
              add: [
                {
                  source: 'in-theinternet',
                  target: 'digital_ocean;\u003ccloud_provider\u003e',
                },
              ],
            },
          });
        });
      },
      fetchNodeDelta: (context, event) => {
        return new Promise((res) => {
          res({
            nodes: [
              {
                id: 'in-theinternet',
                label: 'The Internet',
                labelMinor: 'Inbound connections',
                rank: 'in-theinternet',
                shape: 'cloud',
                pseudo: true,
                adjacency: [
                  'aws;\u003ccloud_provider\u003e',
                  'azure;\u003ccloud_provider\u003e',
                  'digital_ocean;\u003ccloud_provider\u003e',
                ],
                immediate_parent_id: '',
              },
              {
                id: 'digital_ocean;\u003ccloud_provider\u003e',
                label: 'DigitalOcean',
                labelMinor: '',
                rank: 'digital_ocean',
                shape: 'digital_ocean',
                metadata: [
                  {
                    id: 'name',
                    label: 'Name',
                    value: 'digital_ocean',
                    priority: 1.0,
                  },
                  {
                    id: 'label',
                    label: 'Label',
                    value: 'DigitalOcean',
                    priority: 2.0,
                  },
                ],
                adjacency: ['digital_ocean;\u003ccloud_provider\u003e'],
                immediate_parent_id: '',
              },
              {
                id: 'out-theinternet',
                label: 'The Internet',
                labelMinor: 'Outbound connections',
                rank: 'out-theinternet',
                shape: 'cloud',
                pseudo: true,
                immediate_parent_id: '',
              },
              {
                id: 'service-elasticloadbalancing-license-server-lb-1223168382.us-east-1.elb.amazonaws.com',
                label: 'license-server-lb-1223168382.us-east-1.elb.amazonaws.com',
                labelMinor: '',
                rank: 'service-elasticloadbalancing-license-server-lb-1223168382.us-east-1.elb.amazonaws.com',
                shape: 'elasticloadbalancing',
                pseudo: true,
                immediate_parent_id: '',
              },
            ],
            edges: {
              add: [
                {
                  source: 'in-theinternet',
                  target: 'digital_ocean;\u003ccloud_provider\u003e',
                },
                {
                  source: 'digital_ocean;\u003ccloud_provider\u003e',
                  target:
                    'service-elasticloadbalancing-license-server-lb-1223168382.us-east-1.elb.amazonaws.com',
                },
              ],
            },
          });
        });
      },
    },
  },
);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useTopologyClient = () => {
  const [state, send] = useMachine(machine);

  const expandQueue: string[] = [];
  const collapsedQueue: string[] = [];

  const [running, setRunning] = useState(false);

  async function onExpand(id: string) {
    if (running) {
      expandQueue.push(id);
    } else {
      const taksId = collapsedQueue.shift();
      setRunning(true);
      await sleep(4000);
      return {
        data: {
          id: taksId,
        },
      };
    }
  }

  async function onCollapse(id: string) {
    if (running) {
      collapsedQueue.push(id);
    } else {
      const taksId = collapsedQueue.shift();
      setRunning(true);
      await sleep(4000);
      return {
        data: {
          id: taksId,
        },
      };
    }
  }

  return {
    onExpand,
    onCollapse,
    data: state.context,
    send,
  };
};
