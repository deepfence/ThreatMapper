/* eslint-disable */
export class TopologyClient {
  constructor(base_url, api_key, refresh_interval, onDataReceived) {
    this.base_url = base_url;
    this.api_key = api_key;
    this.refresh_interval = refresh_interval;
    this.onDataReceived = onDataReceived;
    this.root_socket = null;
    this.node_sockets = {};
  }

  openRootSocket(view_type) {
    const url = this.topologyUrl(TopologyNodeType[view_type]);

    const socket = this.openSocket(url);
    socket.onopen = () => {
    };

    socket.onclose = () => {
      this.root_socket = null;
    };

    socket.onerror = (event) => {
      console.error("root socket error", event);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.onDataReceived(null, data);
    };

    this.root_socket = socket;
  }

  closeRootSocket() {
    if (this.root_socket !== null) {
      this.root_socket.close();
    }
  }

  openNodeSocket(node_id, node_label, node_type, children_type) {
    const args = { [topologyNodeTypeToQueryType(node_type)]: node_label };
    const url = this.topologyUrl(children_type, args);

    const key = this.socketKey(node_id, children_type);
    const socket = this.openSocket(url);

    socket.onopen = () => {
      console.log("opened node socket", url, node_id, key);
    };

    socket.onclose = () => {
      console.log("closed node socket", url, node_id);
      try {
        // this can fail if we get a failure before we insert the socket in node_sockets
        delete this.node_sockets[key];
      } catch (e) {}
    };

    socket.onerror = (event) => {
      console.error("node socket error", node_id, event);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.onDataReceived(node_id, data);
    };

    this.node_sockets[key] = socket;
  }

  closeNodeSocket(node_id, children_type) {
    const key = this.socketKey(node_id, children_type);

    this.node_sockets[key].close();
  }

  close() {
    for (const key in this.node_sockets) {
      if (!this.node_sockets.hasOwnProperty(key)) {
        continue;
      }

      try {
        this.node_sockets[key].close();
      } catch (e) {}
      delete this.node_sockets[key];
    }
    try {
      this.closeRootSocket();
    } catch (e) {}
  }

  openSocket(url) {
    return new WebSocket(url);
  }

  socketKey(node_id, children_type) {
    return `${node_id}-${children_type}`;
  }

  topologyUrl(type, query_args = {}) {
    let url = this.base_url;

    url = `${url}/topology/${type}`;

    const args = { ...this.topologyQueryArgs(type), ...query_args };
    let qs = new URLSearchParams(args).toString();
    url = `${url}/ws?${qs}`;

    return url;
  }

  topologyQueryArgs(type) {
    let args = {
      api_key: this.api_key,
      t: this.refresh_interval,
      // this is actually not implemented for many node types, but better than
      // nothing...
      pseudo: "hide",
    };
    switch (type) {
      case TopologyNodeType.CLOUD_PROVIDER:
        args.pseudo = "show";
        break;
      case TopologyNodeType.POD:
      case TopologyNodeType.CONTAINER:
      case TopologyNodeType.PROCESS:
        args.unconnected = "hide";
        break;
      default:
        break;
    }
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

export const topologyNodeTypeToQueryType = (type) => {
  const types = {
    [TopologyNodeType.CLOUD_PROVIDER]: "cloud_provider",
    [TopologyNodeType.REGION]: "cloud_region",
    [TopologyNodeType.HOST]: "host_name",
    [TopologyNodeType.POD]: "pod",
    [TopologyNodeType.CONTAINER]: "container",
    [TopologyNodeType.KUBERNETES_CLUSTER]: "kubernetes-clusters",
  };

  const ret = types[type];
  if (ret === undefined) {
    console.error("no query type for topology node type", type);
    return null;
  }

  return ret;
};

export const fetchTopologyData = (
  api_url,
  api_key,
  node_id,
  view_type,
  node_label,
  node_type,
  children_type
) => {
  return new Promise((resolve, reject) => {
    const client = new TopologyClient(api_url, api_key, "60s", (id, data) => {
      if (id == node_id) {
        resolve(data.add);
        client.close();
      }
    });
    if (node_id !== null) {
      client.openNodeSocket(node_id, node_label, node_type, children_type);
    } else {
      client.openRootSocket(view_type);
    }
  });
};
