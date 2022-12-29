import { useMachine } from '@xstate/react';
import { remove } from 'lodash-es';
import { createMachine } from 'xstate';

const createDiffData = (
  previousData: {
    nodes: {
      [x: string]: any;
    };
    edges: {
      [x: string]: any;
    };
  },
  data: {
    nodes: {
      [x: string]: any;
    };
    edges: {
      [x: string]: any;
    };
  },
) => {
  const nodesDiff: {
    add: any;
    delete: any;
    update: any;
  } = {
    add: [],
    delete: [],
    update: [],
  };
  const edgesDiff: {
    add: any;
    delete: any;
    update: any;
  } = {
    add: [],
    delete: [],
    update: [],
  };
  const nodes = new Map<string, any>();
  const prevNodes = new Map<string, any>();
  const edges = new Map<string, any>();
  const prevEdges = new Map<string, any>();
  Object.keys(data.nodes).forEach((id) => {
    const node = data.nodes[id];
    nodes.set(node.id, node);
  });
  Object.keys(previousData.nodes).forEach((id) => {
    const node = previousData.nodes[id];
    prevNodes.set(node.id, node);
  });
  prevNodes.forEach((prevNode, id) => {
    if (nodes.has(id)) {
      nodesDiff.update.push(prevNode);
    } else {
      nodesDiff.delete.push(prevNode);
    }
  });
  nodes.forEach((node, id) => {
    if (!prevNodes.has(id)) {
      nodesDiff.add.push(node);
    }
  });

  Object.keys(data.edges).forEach((id) => {
    const edge = data.edges[id];
    edges.set(id, edge);
  });
  Object.keys(previousData.edges).forEach((id) => {
    const edge = previousData.edges[id];
    prevEdges.set(id, edge);
  });
  prevEdges.forEach((prevEdge, id) => {
    if (edges.has(id)) {
      edgesDiff.update.push(prevEdge);
    } else {
      edgesDiff.delete.push(prevEdge);
    }
  });
  edges.forEach((edge, id) => {
    if (!prevEdges.has(id)) {
      edgesDiff.add.push(edge);
    }
  });
  console.log('diff is', {
    nodes: nodesDiff,
    edges: edgesDiff,
  });
  return {
    nodes: nodesDiff,
    edges: edgesDiff,
  };
};

interface MachineContext {
  refreshInterval: number;
  data: any;
  previousData: any;
  diff: any;
  params: {
    cloud_filter: string[];
    region_filter: string[];
    host_filter: string[];
  };
  fetchAbortController: AbortController | null;
}

interface ReceiveTopologyDataEvent {
  type: 'receive topology data';
}

interface ExpandCollapseEvent {
  type: 'expand collapse';
}

interface UpdateIntervalEvent {
  type: 'update interval';
  refreshInterval: number;
}

interface SaveTopologyDataEvent {
  type: 'save topology data';
  data: any;
}

interface CreateAndSaveDiffEvent {
  type: 'create and save diff';
}

interface SaveFilterParamsEvent {
  type: 'save filter params';
  filters: {
    nodeType: string;
    actionType: 'expand' | 'collapse';
    id: string;
  };
}

export const topologyClientMachine =
  /** @xstate-layout N4IgpgJg5mDOIC5QBUD2AHVAbVUCeABAMJYCWYAdgC4DEYAHugIYUQEDG2WT6sYA2gAYAuolCZYpKqVQUxIeogBMAFgB0KwVu07tANgA0IPIgCcAZjVbzSrQEYA7Kb12ArKYC+Ho2kw58xGSUtACu6BBMVGAEpNRgAE4AbkxYQqJIIBJSMnIZighKdoJqABxGJggWVoI29k4u7l4+GNi4hCTk1GoAZmBU7AAWsVAEVC3+hBFUTDQQsmBqsYmoANYLvf0Dvq34ACKRTGnyWdKy8vl6KpbmNW5aDubuduXKguq21g6XJVp6eiVNEDbCaBTpUHp9QbDUbjNoEKYzBLxVDxNTobhUboogC2EM2wLa+2mRwyJxy50Qrj0llMDlcgkK1JKLhsLwQ5j0SlKgk5Fj0DhKDiUhUBBICHWCiwgWDANHosGmUTUTG6UXiAAoAEoAUQAYjqAMoACQA+gBJAByyG1moAagBBAAyAEoaGL2kEuqRpQIRMdUJJTrlQPkvsVCoLXHYfnoLEpTGySnY1PTtEpXCVzCo7KY7OYvN4QBRUBA4PJ3aDgv7A+S8ogALRKSzuUyttvt1sqNn11xqDsObN6DOCZkAwsViVdDZQigjMZ+OEI6vZM51gqmPuCCwlVs3P6ckdspRJlOtjM2OzRwQDlSi2Hiz3g70y5dBimVEq9yP2DOf3dHlQN1MHlzDuWkbhzPQCw8IA */
  createMachine<
    MachineContext,
    | ReceiveTopologyDataEvent
    | ExpandCollapseEvent
    | UpdateIntervalEvent
    | SaveTopologyDataEvent
    | CreateAndSaveDiffEvent
    | SaveFilterParamsEvent
  >(
    {
      // tsTypes: {} as import('./useTopologyClient.typegen').Typegen0,
      id: 'Topology Client',
      initial: 'fetching topology data',
      states: {
        'fetching topology data': {
          invoke: {
            src: 'fetch topology data',
            id: 'fetchTopologyData',
            onError: 'idle',
            onDone: [
              {
                target: 'idle',
                actions: ['save topology data', 'create and save diff'],
              },
            ],
          },
        },

        idle: {
          after: {
            REFRESH_INTERVAL: {
              target: '#Topology Client.fetching topology data',
              actions: [],
              internal: false,
            },
          },
        },
      },
      on: {
        'expand collapse': {
          target: '.fetching topology data',
          actions: 'save filter params',
        },
        'update interval': {
          target: '.fetching topology data',
          actions: 'save interval',
        },
      },
      context: {
        refreshInterval: 30000,
        data: { nodes: {}, edges: {} },
        previousData: { nodes: {}, edges: {} },
        diff: { nodes: {}, edges: {} },
        params: {
          cloud_filter: [],
          host_filter: [],
          region_filter: [],
        },
        fetchAbortController: null,
      },
      predictableActionArguments: true,
      preserveActionOrder: true,
    },
    {
      actions: {
        'save interval': (context, event: UpdateIntervalEvent) => {
          console.log('saving interval', context);
          context.refreshInterval = event.refreshInterval;
        },
        'save topology data': (context, event: SaveTopologyDataEvent) => {
          console.log('saving topology data', context);
          context.previousData = context.data;
          context.data = event.data;
        },
        'create and save diff': (context) => {
          console.log('createing and saving diff', context);
          context.diff = createDiffData(context.previousData, context.data);
        },
        'save filter params': (context, event: SaveFilterParamsEvent) => {
          console.log('new filters', event);
          const id = event.filters.id.split(';')[0];
          if (
            event.filters.nodeType === 'cloud' &&
            event.filters.actionType === 'expand'
          ) {
            context.params.cloud_filter.push(id);
          } else if (
            event.filters.nodeType === 'cloud' &&
            event.filters.actionType === 'collapse'
          ) {
            remove(context.params.cloud_filter, (cloud) => cloud === id);
          } else if (
            event.filters.nodeType === 'region' &&
            event.filters.actionType === 'expand'
          ) {
            context.params.region_filter.push(id);
          } else if (
            event.filters.nodeType === 'region' &&
            event.filters.actionType === 'collapse'
          ) {
            remove(context.params.region_filter, (cloud) => cloud === id);
          } else if (
            event.filters.nodeType === 'host' &&
            event.filters.actionType === 'expand'
          ) {
            context.params.host_filter.push(id);
          } else if (
            event.filters.nodeType === 'host' &&
            event.filters.actionType === 'collapse'
          ) {
            remove(context.params.host_filter, (cloud) => cloud === id);
          }
        },
      },
      delays: {
        REFRESH_INTERVAL: (context) => {
          console.log('refreshing interval', context);
          return context.refreshInterval;
        },
      },
      services: {
        'fetch topology data': async (context) => {
          console.log('fetching data', context);
          context.fetchAbortController?.abort('cancel existing call');

          const body = context.params;

          const controller = new AbortController();
          const options = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: 'Bearer ',
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          };
          context.fetchAbortController = controller;
          const response = await fetch(
            'http://localhost:5173/deepfence/graph/topology',
            options,
          );
          const responseJson = await response.json();
          console.log('got response', responseJson);
          return responseJson;
        },
      },
    },
  );

export const useTopologyClient = () => {
  return useMachine(topologyClientMachine);
};
