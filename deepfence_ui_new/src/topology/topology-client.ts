export type TopologyClientInstanceParams = {
  base_url: string;
  api_key: string;
  refresh_interval: string;
  view_type: string;
  vulnerability_filter: string;
  onDataReceived?: (data: any) => void;
  onInvalidSocketRefrence?: () => void;
};

export type StringIndexType<TValue> = {
  [key: string]: TValue;
};

type SocketMessageContentType = {
  topology_id: string;
  node_id: string;
  children: {
    topology_id?: string;
    filters?: {
      vulnerability_scan_status: string;
    };
  }[];
  parents?: StringIndexType<string>;
};

type SocketMessageType = {
  add?: SocketMessageContentType;
  remove?: SocketMessageContentType;
};

export const TopologyNodeType = {
  CLOUD_PROVIDER: 'cloud-providers',
  REGION: 'cloud-regions',
  KUBERNETES_CLUSTER: 'kubernetes-clusters',
  HOST: 'hosts',
  POD: 'pods',
  CONTAINER: 'containers',
  PROCESS: 'processes',
};

export class TopologyClient {
  base_url: string;
  api_key: string;
  refresh_interval: string;
  view_type: string;
  vulnerability_filter: string;
  onDataReceived: (data: any) => void;
  onInvalidSocketRefrence: () => void;

  socket: WebSocket | null;

  constructor(
    base_url: string,
    api_key: string,
    refresh_interval: string,
    view_type: string,
    vulnerability_filter: string,
    onDataReceived: (data: any) => void,
    onInvalidSocketRefrence: () => void,
  ) {
    this.base_url = base_url;
    this.api_key = api_key;
    this.refresh_interval = refresh_interval;
    this.view_type = view_type;
    this.vulnerability_filter = vulnerability_filter;
    this.onDataReceived = onDataReceived;
    this.onInvalidSocketRefrence = onInvalidSocketRefrence;

    this.socket = null;
  }

  buildUrl(query_args = {}) {
    let url = `${this.base_url}/topology-connection-ws`;
    const args = { ...this.defaultQueryArgs(), ...query_args };
    const qs = new URLSearchParams(args).toString();
    url = `${url}?${qs}`;
    return url;
  }

  defaultQueryArgs() {
    return {
      api_key: this.api_key,
      t: this.refresh_interval,
      ignore_collapsed: 'true',
    };
  }

  open(query_args = {}) {
    const url = this.buildUrl(query_args);
    const socket = this.openSocket(url);

    socket.onopen = () => {
      this.sendInitialMessage();
    };

    socket.onclose = () => {
      this.socket = null;
    };

    socket.onerror = (event) => {
      console.error('socket error', event);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.onDataReceived(data);
    };

    this.socket = socket;
  }

  openSocket(url: string) {
    return new WebSocket(url);
  }

  close() {
    try {
      if (this.socket !== null) {
        this.socket.close();
      }
    } catch (e) {
      console.error(e);
    }
  }

  sendInitialMessage() {
    const message = {
      add: {
        topology_id: '',
        node_id: '',
        children: [
          {
            topology_id: this.view_type,
            filters: {
              vulnerability_scan_status: this.vulnerability_filter,
            },
          },
        ],
      },
    };
    this.send(message);
  }

  send(message: SocketMessageType) {
    if (this.socket) {
      this.socket.send(JSON.stringify(message));
    } else if (this.onInvalidSocketRefrence) {
      // inform consumer about trying to send message after socket close.
      this.onInvalidSocketRefrence();
    }
  }

  expandNode(
    node_id: string,
    node_type: string,
    parents: StringIndexType<string>,
    children_types: string[],
  ) {
    const children_with_filters = children_types.map((type) => {
      return expandFilters(node_type, type);
    });
    const message = {
      add: {
        topology_id: node_type,
        node_id,
        children: children_with_filters,
        parents,
      },
    };
    this.send(message);
  }

  collapseNode(node_id: string, node_type: string, parents: StringIndexType<string>) {
    const message = {
      remove: {
        topology_id: node_type,
        node_id,
        children: [],
        parents,
      },
    };
    this.send(message);
  }
}

export const TOPOLOGY_NODE_TYPES = Object.values(TopologyNodeType);
export const TOPOLOGY_NODE_TYPES_REVERSED = [...TOPOLOGY_NODE_TYPES].reverse();

const expandFilters = (node_type: string, child_type: string) => {
  const ret: StringIndexType<object | string> = { topology_id: child_type };

  if (child_type == TopologyNodeType.PROCESS) {
    ret.filters = { unconnected: 'hide' };
  } else if (child_type === TopologyNodeType.HOST) {
    ret.filters = { immediate_parent: node_type };
  }

  return ret;
};
