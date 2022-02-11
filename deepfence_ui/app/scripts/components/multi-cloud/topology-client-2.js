/* eslint-disable */
export class TopologyClient {
  constructor(base_url, api_key, refresh_interval, onDataReceived, onInvalidSocketRefrence) {
    this.base_url = base_url;
    this.api_key = api_key;
    this.refresh_interval = refresh_interval;
    this.onDataReceived = onDataReceived;
    this.onInvalidSocketRefrence = onInvalidSocketRefrence;
    this.socket = null;
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
      console.error("socket error", event);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.onDataReceived(data);
    };

    this.socket = socket;
  }

  openSocket(url) {
    return new WebSocket(url);
  }

  close() {
    try {
      if (this.socket !== null) {
        this.socket.close();
      }
    } catch (e) {}
  }

  expandNode(node_id, node_type, parents, children_types) {
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

  collapseNode(node_id, node_type, parents) {
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

  sendInitialMessage() {
    const message = {
      add: {
        topology_id: "",
        node_id: "",
        children: [{ topology_id: TopologyNodeType.CLOUD_PROVIDER }],
      },
    };
    this.send(message);
  }

  send(message) {
    if (this.socket) {
      this.socket.send(JSON.stringify(message));
    } else if (this.onInvalidSocketRefrence) {
      // inform consumer about trying to send message after socket close.
      this.onInvalidSocketRefrence();
    }
  }

  buildUrl(type, query_args = {}) {
    let url = `${this.base_url}/topology-connection-ws`;

    const args = { ...this.defaultQueryArgs(), ...query_args };
    let qs = new URLSearchParams(args).toString();
    url = `${url}?${qs}`;

    return url;
  }

  defaultQueryArgs() {
    let args = {
      api_key: this.api_key,
      t: this.refresh_interval,
      ignore_collapsed: "true",
    };

    return args;
  }
}

export const TopologyNodeType = {
  CLOUD_PROVIDER: "cloud-providers",
  REGION: "cloud-regions",
  KUBERNETES_CLUSTER: "kubernetes-clusters",
  HOST: "hosts",
  POD: "pods",
  CONTAINER: "containers",
  PROCESS: "processes",
};

export const TOPOLOGY_NODE_TYPES = Object.values(TopologyNodeType);
export const TOPOLOGY_NODE_TYPES_REVERSED = [...TOPOLOGY_NODE_TYPES].reverse();

const expandFilters = (node_type, child_type) => {
  const ret = { topology_id: child_type };

  if (child_type == TopologyNodeType.PROCESS) {
    ret.filters = { unconnected: "hide" };
  } else if (child_type === TopologyNodeType.HOST) {
    ret.filters = { immediate_parent: node_type };
  }

  return ret;
};
