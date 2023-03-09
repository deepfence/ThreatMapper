package main

import (
	"fmt"
	"log"
	"math/rand"
	"os"
	"strconv"
	"time"

	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

func populate(base map[string]interface{}, n, tt int) []map[string]interface{} {

	entries := []map[string]interface{}{}
	for i := 0; i < n; i++ {
		new_image := map[string]interface{}{}
		for k, v := range base {
			new_image[k] = v
		}
		new_image["node_id"] = strconv.Itoa(i + n*tt)
		new_image["vulnerabilities_count"] = random(0, 80)
		new_image["exploitability_score"] = random(0, 80)
		if new_image["host_name"] != nil {
			new_image["host_name"] = new_image["host_name"].(string) + strconv.Itoa(i+n*tt)
		}
		if new_image["docker_image_name"] != nil {
			new_image["docker_image_name"] = new_image["docker_image_name"].(string) + strconv.Itoa(i+n*tt)
		}
		if new_image["docker_container_name"] != nil {
			new_image["docker_container_name"] = new_image["docker_container_name"].(string) + strconv.Itoa(i+n*tt)
		}
		entries = append(entries, new_image)
	}

	return entries
}

func random(min, max int) int {
	return rand.Intn(max-min) + min
}

func main() {
	nn := os.Getenv("NUM")
	tt, e := strconv.Atoi(nn)
	if e != nil {
		log.Fatal(e)
	}

	for i := 0; i < tt; i++ {
		apply(i)
	}
}

const (
	num_images              = 100_000
	num_hosts               = 100
	num_containers          = 100_000
	num_vulenrabilities     = 1000
	num_vulenrability_scans = 100_000
)

func apply(round int) {

	base_image := map[string]interface{}{
		"docker_image_label_deepfence.role": "system",
		"node_type":                         "container_image",
		"docker_image_created_at":           "1970-01-01T00:00:00Z",
		"updated_at":                        time.Now().Unix(),
		"docker_image_tag":                  "thomas",
		"docker_image_size":                 "242 B",
		"docker_image_virtual_size":         "1.2 GB",
		"docker_image_id":                   "53dad07920dd2ca6d619b3b35d424407e9b39e015a8ba8406b27cac05cf96f44",
		"host_node_id":                      "k8s-cluster-pool-7xaib1tqu-mkdk4;<host>",
		"docker_image_name":                 "docker.io/deepfenceio/deepfence_agent_ce",
		"user_defined_tags":                 "",
		"node_id":                           "",
	}

	images := populate(base_image, num_images, round)

	base_host := map[string]interface{}{
		"vulnerabilities_count":   80,
		"cloud_region":            "Serverless",
		"kubernetes_cluster_name": "",
		"control_probe_id":        "17919ef2ef95d01d",
		"host_node_id":            "flac-desktop;<host>",
		"node_type":               "host",
		"updated_at":              time.Now().Unix(),
		"num_cve":                 80,
		"sum_cve":                 170,
		"interface_ips":           "{\"172.17.0.1\":\"255.255.0.0\",\"192.168.1.4\":\"255.255.255.0\",\"192.168.122.1\":\"255.255.255.0\"}",
		"sum_secrets":             0,
		"cloud_metadata":          "{\"cloud_provider\":\"Serverless\",\"public_ip\":[\"192.168.1.4\"],\"private_ip\":null,\"label\":\"Private Cloud\",\"region\":\"Serverless\"}",
		"os":                      "linux",
		"kubernetes_cluster_id":   "",
		"probeId":                 "17919ef2ef95d01d",
		"num_compliance":          0,
		"cloud_provider":          "Serverless",
		"is_ui_vm":                "false",
		"interfaceNames":          "lo;enp3s0;virbr0;docker0",
		"agent_running":           "yes",
		"version":                 "v1.4.2-933b2229-1678120065060323",
		"uptime":                  "119863",
		"depth":                   1,
		"kernel_version":          "6.1.0-5-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.12-1 (2023-02-15)",
		"num_secrets":             0,
		"sum_compliance":          0,
		"user_defined_tags":       "",
		"host_name":               "flac-desktop",
		"ts":                      "2023-03-07T09:14:30.986914443Z",
		"node_id":                 "flac-desktop",
	}

	hosts := populate(base_host, num_hosts, round)

	base_container := map[string]interface{}{
		"docker_is_in_host_network":     "true",
		"docker_container_name":         "deepfence-agent",
		"docker_container_created":      "2023-03-06T16:30:33.001468818Z",
		"docker_container_uptime":       "61250",
		"docker_container_state":        "running",
		"docker_label_deepfence.role":   "system",
		"control_probe_id":              "17919ef2ef95d01d",
		"is_ui_vm":                      "false",
		"docker_container_id":           "bcfca60982e3e91781e177f0f4d9d592e69165808d95bd162c71bc0940b7ed1b",
		"docker_container_command":      "/usr/local/bin/start_services ",
		"host_node_id":                  "flac-desktop;<host>",
		"docker_container_network_mode": "host",
		"docker_container_hostname":     "flac-desktop",
		"node_type":                     "container",
		"updated_at":                    time.Now().Unix(),
		"docker_container_state_human":  "Up 17 hours",
		"docker_image_id":               "53dad07920dd2ca6d619b3b35d424407e9b39e015a8ba8406b27cac05cf96f44",
		"host_name":                     "flac-desktop",
		"user_defined_tags":             "",
		"node_id":                       "bcfca60982e3e91781e177f0f4d9d592e69165808d95bd162c71bc0940b7ed1b",
		"vulnerabilities_count":         80,
	}

	containers := populate(base_container, num_containers, round)

	base_vulnerability := map[string]interface{}{
		"parsed_attack_vector":    "local",
		"kubernetes_cluster_name": "",
		"cve_container_layer":     "",
		"cve_container_image":     "nginx:latest",
		"cve_caused_by_package":   "libpcre3:2:8.39-13",
		"type":                    "cve",
		"urls": []string{
			"http://www.securityfocus.com/bid/97067",
			"https://access.redhat.com/errata/RHSA-2018:2486",
			"https://access.redhat.com/security/cve/CVE-2017-7245",
			"https://blogs.gentoo.org/ago/2017/03/20/libpcre-two-stack-based-buffer-overflow-write-in-pcre32_copy_substring-pcre_get-c/",
			"https://security.gentoo.org/glsa/201710-25",
		},
		"vulnerability_score":        5.217800149005297,
		"node_type":                  "container_image",
		"cve_severity":               "critical",
		"cve_caused_by_package_path": "",
		"host":                       "flac-desktop",
		"cve_container_image_id":     "3f8a00f137a0d2c8a2163a09901e28e2471999fde4efc2f9570b91f1c30acf94",
		"cve_description":            "Stack-based buffer overflow in the pcre32_copy_substring function in pcre_get.c in libpcre1 in PCRE 8.40 allows remote attackers to cause a denial of service (WRITE of size 4) or possibly have unspecified other impact via a crafted file.",
		"count":                      0,
		"cve_overall_score":          7.8,
		"doc_id":                     "",
		"cve_attack_vector":          "CVSS:3.0/AV:L/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:H",
		"cve_cvss_score":             7.8,
		"updated_at":                 time.Now().Unix(),
		"cve_id":                     "CVE-2017-7245",
		"exploit_poc":                "",
		"has_live_connection":        true,
		"cve_type":                   "base",
		"cve_fixed_in":               "",
		"cve_container_name":         "",
		"scan_id":                    "3f8a00f137a0d2c8a2163a09901e28e2471999fde4efc2f9570b91f1c30acf94-1677120714",
		"cve_link":                   "https://security.gentoo.org/glsa/201710-25",
		"host_name":                  "flac-desktop",
		"exploitability_score":       0,
		"cve_id_cve_severity_cve_container_image": "",
		"node_id":               "CVE-2017-7245",
		"vulnerabilities_count": 80,
	}

	vulnerabilities := populate(base_vulnerability, num_vulenrabilities, round)

	base_vulnerability_scan := map[string]interface{}{
		"retries":        0,
		"updated_at":     time.Now().Unix(),
		"trigger_action": "{\"id\":0,\"request_payload\":\"{\"node_id\":\"3f8a00f137a0d2c8a2163a09901e28e2471999fde4efc2f9570b91f1c30acf94\",\"node_type\":1,\"bin_args\":{\"image_name\":\"nginx:latest\",\"node_id\":\"3f8a00f137a0d2c8a2163a09901e28e2471999fde4efc2f9570b91f1c30acf94\",\"node_type\":\"image\",\"registry_id\":\"\",\"scan_id\":\"3f8a00f137a0d2c8a2163a09901e28e2471999fde4efc2f9570b91f1c30acf94-1676448786\",\"scan_type\":\"all\"}}\"}",
		"status":         "COMPLETE",
		"node_id":        "3f8a00f137a0d2c8a2163a09901e28e2471999fde4efc2f9570b91f1c30acf94-1676448786",
	}

	vulnerability_scans := populate(base_vulnerability_scan, num_vulenrability_scans, round)

	fmt.Println("Data ready to be ingested")

	tc, err := neo4j.NewDriver("bolt://143.110.232.114:7687", neo4j.BasicAuth("neo4j", "e16908ffa5b9f8e9d4ed", ""))
	if err != nil {
		log.Fatal(err)
	}

	session, err := tc.Session(neo4j.AccessModeWrite)
	if err != nil {
		log.Fatal(err)
	}

	defer session.Close()

	_, err = session.Run(`
		UNWIND $images as row
		MERGE (n:ContainerImage{node_id:row.node_id})
		SET n += row`,
		map[string]interface{}{"images": images})
	if err != nil {
		log.Fatal(err)
	}

	_, err = session.Run(`
		UNWIND $hosts as row
		MERGE (n:Node{node_id:row.node_id})
		SET n += row`,
		map[string]interface{}{"hosts": hosts})
	if err != nil {
		log.Fatal(err)
	}

	_, err = session.Run(`
		UNWIND $containers as row
		MERGE (n:Container{node_id:row.node_id})
		SET n += row`,
		map[string]interface{}{"containers": containers})
	if err != nil {
		log.Fatal(err)
	}

	_, err = session.Run(`
		UNWIND $vulnerabilities as row
		MERGE (n:Vulnerability{node_id:row.node_id})
		SET n += row`,
		map[string]interface{}{"vulnerabilities": vulnerabilities})
	if err != nil {
		log.Fatal(err)
	}

	_, err = session.Run(`
		UNWIND $vulnerability_scans as row
		MERGE (n:VulnerabilityScan{node_id:row.node_id})
		SET n += row`,
		map[string]interface{}{"vulnerability_scans": vulnerability_scans})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Added all nodes\n")

	link_host_container_image := []map[string]string{}
	for i := 0; i < num_hosts; i++ {
		for j := 0; j < 100; j++ {
			link_host_container_image = append(link_host_container_image,
				map[string]string{"left": strconv.Itoa(i), "right": strconv.Itoa(i*100 + j)})
		}
	}

	_, err = session.Run(`
		UNWIND $links as row
		MATCH (n:Node{node_id:row.left})
		MATCH (m:ContainerImage{node_id:row.right})
		MERGE (n) -[:HOSTS]->(m)`,
		map[string]interface{}{"links": link_host_container_image})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Linked 1\n")
	link_host_container := []map[string]string{}
	for i := 0; i < num_hosts; i++ {
		for j := 0; j < 100; j++ {
			link_host_container = append(link_host_container,
				map[string]string{"left": strconv.Itoa(i), "right": strconv.Itoa(i*100 + j)})
		}
	}

	_, err = session.Run(`
		UNWIND $links as row
		MATCH (n:Node{node_id:row.left})
		MATCH (m:Container{node_id:row.right})
		MERGE (n) -[:HOSTS]->(m)`,
		map[string]interface{}{"links": link_host_container})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Linked 2\n")

	_, err = session.Run(`
		MATCH (n:ContainerImage)
		MATCH (m:VulnerabilityScan{node_id: n.node_id})
		MERGE (m) -[:SCANNED]->(n)`,
		map[string]interface{}{})

	if err != nil {
		log.Fatal(err)
	}

	_, err = session.Run(`
		MATCH (n:Node)
		MATCH (m:VulnerabilityScan{node_id: n.node_id})
		MERGE (m) -[:SCANNED]->(n)`,
		map[string]interface{}{})

	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Linked 3\n")

	link_vuln_scan := []map[string]string{}
	for i := 0; i < num_vulenrability_scans; i++ {
		for j := 0; j < 10; j++ {
			link_vuln_scan = append(link_vuln_scan,
				map[string]string{"left": strconv.Itoa(i), "right": strconv.Itoa((i*10 + j) % num_vulenrabilities)})
		}
	}
	_, err = session.Run(`
		UNWIND $links as row
		MATCH (n:VulnerabilityScan{node_id:row.left})
		MATCH (m:Vulnerability{node_id:row.right})
		MERGE (m) -[:DETECTED]->(n)`,
		map[string]interface{}{"links": link_vuln_scan})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Linked all nodes\n")
}
