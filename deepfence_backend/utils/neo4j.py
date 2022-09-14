from datetime import datetime
from py2neo import Graph, Node, Relationship

class Neo4jGraph:

    def __init__(self):
        self.db = Graph("bolt://neo4j-db:7687", auth=("neo4j", "password"))
        #self.db.run("CREATE CONSTRAINT ON (n:CveScan) ASSERT n.scan_id IS UNIQUE")
        #self.db.run("CREATE CONSTRAINT ON (n:SecretScan) ASSERT n.scan_id IS UNIQUE")
        #self.db.run("CREATE CONSTRAINT ON (n:ComplianceScan) ASSERT n.scan_id IS UNIQUE")

    def clear_graph(self):
        self.db.run("MATCH (a) DETACH DELETE a")

    def clear_connections(self):
        self.db.run("MATCH ()-[c:CONNECTED]->() DELETE c")

    def add_host_entry(self, entry):
        host  = {}
        if 'kubernetes_cluster_name' in host:
            host["kubernetes_cluster_name"] = entry["kubernetes_cluster_name"]

        host["node_type"] = entry.get("node_type", "")
        host["node_id"] = entry["node_id"]
        host["cloud_provider"] = entry.get("cloud_provider", "")
        host["depth"] = entry.get("depth", "")

        host_node = Node('Node', **host)
        self.db.merge(host_node, 'Node', 'node_id')
        return host_node

    def add_scan_entry(self, entry, type):
        scan = {}
        scan["scan_id"] = entry["scan_id"]
        scan["time_stamp"] = datetime.now()

        scan_node = Node(type, **scan)
        self.db.merge(scan_node, type, "scan_id")
        return scan_node

    def add_host_process(self, entry):
        host_id = entry["id"].split(';')[0]
        host_node = self.add_host_entry({'node_id':host_id})

        process = {}
        process["id"] = entry["id"]
        #process["metadata"] = entry["metadata"]

        process_node = Node("Process", **process)
        self.db.merge(process_node, "Process", "id")

        self.db.merge(Relationship(host_node, 'RUNS', process_node))
        return process_node

    def add_pod_entry(self, entry):
        host_id = entry["id"].split(';')[0]

        host  = {}
        host["node_type"] = "pod"
        host["node_id"] = host_id
        host["cloud_provider"] = entry.get("cloud_provider", "")
        host["depth"] = entry.get("depth", "")
        #host["metadata"] = entry["metadata"]

        host_node = Node('Node', **host)
        self.db.merge(host_node, 'Node', 'node_id')
        return host_node


    def add_cve_entry(self, entry):
        host_node = self.add_host_entry(entry)
        scan_node = self.add_scan_entry(entry, 'CveScan')

        cve = {}
        cve["cve_id"] = entry["cve_id"]
        cve["cve_type"] = entry["cve_type"]
        cve["cve_severity"] = entry["cve_severity"]
        cve["cve_container_image"] = entry["cve_container_image"]
        cve["cve_container_image_id"] = entry["cve_container_image_id"]
        cve["cve_caused_by_package"] = entry["cve_caused_by_package"]
        cve["cve_caused_by_package_path"] = entry["cve_caused_by_package_path"]
        cve["cve_link"] = entry["cve_link"]
        cve["cve_description"] = entry["cve_description"]
        cve["urls"] = entry["urls"]

        cve_node = Node('Cve', **cve)
        self.db.merge(cve_node, 'Cve', 'cve_id')

        self.db.merge(Relationship(host_node, 'SCANNED', scan_node))
        self.db.merge(Relationship(scan_node, 'DETECTED', cve_node))

    def add_secret_entry(self, entry):
        entry['node_id'] = entry['node_name']
        host_node = self.add_host_entry(entry)
        scan_node = self.add_scan_entry(entry, 'SecretScan')

        rule  = entry["Rule"]
        sev  = entry["Severity"]
        match = entry["Match"]
        rule_node = Node('Rule', **rule)
        self.db.merge(rule_node, 'Rule', 'id')
        secret_node = Node('Secret', **{**match, **sev})
        self.db.merge(secret_node, 'Secret', 'full_filename')
        self.db.merge(Relationship(rule_node, 'MATCH', secret_node))

        self.db.merge(Relationship(host_node, 'SCANNED', scan_node))
        self.db.merge(Relationship(scan_node, 'DETECTED', secret_node))

    def add_compliance_entry(self, entry):
        host_node = self.add_host_entry(entry)
        scan_node = self.add_scan_entry(entry, 'ComplianceScan')

        compliance = {}
        paths = []
        for path in entry["locations"]:
            paths.append(path["path"])
        compliance["locations"] = paths
        compliance["language"] = entry["language"]
        compliance["name"] = entry["name"]
        compliance["licenses"] = entry["licenses"]
        compliance["masked"] = entry["masked"]
        compliance["version"] = entry["version"]

        compliance_node = Node('Compliance', **compliance)
        self.db.merge(compliance_node, 'Compliance', 'name')

        self.db.merge(Relationship(host_node, 'SCANNED', scan_node))
        self.db.merge(Relationship(scan_node, 'DETECTED', compliance_node))

    def add_entry(self, entry):
        if "cve_id" in entry:
            self.add_cve_entry(entry)
        elif "Rule" in entry:
            self.add_secret_entry(entry)
        elif "name" in entry:
            self.add_compliance_entry(entry)

    def add_connection_proc(self, node_id1, node_id2):
        self.db.run("""
        MATCH (n1:Process{node_id: $entry1}), (n2:Process{node_id: $entry2})
        MERGE (n1) -[:CONNECTED]-> (n2)""", entry1=node_id1, entry2=node_id2)

    def add_connection_entry(self, node_id1, node_id2):
        self.db.run("""
        MATCH (n1:Node{node_id: $entry1}), (n2:Node{node_id: $entry2})
        MERGE (n1) -[:CONNECTED]-> (n2)""", entry1=node_id1, entry2=node_id2)

    def compute_threat_graph(self, cloud_providers):

        # Remove all self connected relationship
        self.db.run("""
        MATCH (n:Node) -[r:CONNECTED]->(n)
        DELETE r
        """)

        # Compute num of Cve for each Node
        self.db.run("""
        MATCH (m)--> (s:CveScan)
        WITH max(s.time_stamp) as most_recent, m
        MATCH (m)-->(s:CveScan {time_stamp: most_recent})-->(c:Cve)
        WITH m, count(distinct c) as num_cve
        SET m.num_cve = num_cve
        """)

        # Compute num of Secret for each Node
        self.db.run("""
        MATCH (m)--> (s:SecretScan)
        WITH max(s.time_stamp) as most_recent, m
        MATCH (m)-->(s:SecretScan {time_stamp: most_recent})-->(c:Secret)
        WITH m, count(distinct c) as num_secrets
        SET m.num_secrets = num_secrets
        """)

        # Compute num of Compliance for each Node
        self.db.run("""
        MATCH (m)--> (s:ComplianceScan)
        WITH max(s.time_stamp) as most_recent, m
        MATCH (m)-->(s:ComplianceScan {time_stamp: most_recent})-->(c:Compliance)
        WITH m, count(distinct c) as num_compliance
        SET m.num_compliance = num_compliance
        """)

        # Prepare sums
        self.db.run("""
        MATCH (n:Node)
        SET n.sum_cve = COALESCE(n.num_cve, 0), n.sum_secrets =
                    COALESCE(n.num_secrets, 0), n.sum_compliance =
                    COALESCE(n.num_compliance, 0);""")

        # Add sums
        self.db.run("""
        MATCH (n:Node) -[:CONNECTED]->(m:Node)
        SET n.sum_cve = COALESCE(n.sum_cve, 0) + COALESCE(m.sum_cve, m.num_cve, 0),
        n.sum_secrets = COALESCE(n.sum_secrets, 0) + COALESCE(m.sum_secrets, m.num_secrets, 0),
        n.sum_compliance = COALESCE(n.sum_compliance, 0) + COALESCE(m.sum_compliance, m.num_compliance, 0);""")

        all = {}
        for cloud_provider in cloud_providers:
            res = self.db.run("""
            CALL apoc.nodes.group(['Root', 'Node'], ['node_type', 'depth',
            'cloud_provider'], [{`*`: 'count', sum_cve: 'sum', sum_secrets: 'sum', sum_compliance: 'sum',
            node_id:'collect', num_cve: 'collect', num_secrets:'collect', num_compliance:'collect'},{`*`: 'count'}], {selfRels: false})
            YIELD node, relationships
            WHERE apoc.any.property(node, 'cloud_provider') = '"""+cloud_provider+"""'
            AND apoc.any.property(node, 'depth') IS NOT NULL
            RETURN node, relationships""")

            tab = res.to_table()
            nodes_tree = {}
            nodes_data = {}
            depth_nodes = {}
            for i in tab:
                node = i[0]
                if "depth" in node:
                    depth = node['depth']
                    for rel in i[1]:
                        if node.identity not in nodes_tree:
                            nodes_tree[node.identity] = set()
                        nodes_tree[node.identity].add(rel.end_node.identity)
                    nodes_data[node.identity] = (node['node_type'],
                                                 node['sum_sum_cve'],
                                                 depth,
                                                 node['count_*'],
                                                 node['cloud_provider'],
                                                 node['collect_node_id'],
                                                 node['collect_num_cve'],
                                                 node['sum_sum_secrets'],
                                                 node['collect_num_secrets'],
                                                 node['sum_sum_compliance'],
                                                 node['collect_num_compliance'])
                    if depth not in depth_nodes:
                        depth_nodes[depth] = set()
                    depth_nodes[depth].add(node.identity)
            all[cloud_provider] = (nodes_tree, nodes_data, depth_nodes)
        return all
