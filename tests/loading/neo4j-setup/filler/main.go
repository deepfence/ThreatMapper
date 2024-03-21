package main

import (
	"flag"
	"fmt"
	"log"
	"math/rand"
	"os"
	"strconv"
	"time"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

var (
	console_ip   string
	console_pass string
)

func init() {
	console_ip = os.Getenv("DF_CONSOLE")
	if console_ip == "" {
		log.Fatal("Missing DF_CONSOLE")
	}
	console_pass = os.Getenv("DF_NEO4J_PASS")
	if console_pass == "" {
		log.Fatal("Missing DF_NEO4J_PASS")
	}
}

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
	var image_num, host_num, container_num, vuln_num, vuln_scan_num, aws_lambda_num int

	flag.IntVar(&image_num, "image_num", 0, "Number of round of images to generate")
	flag.IntVar(&host_num, "host_num", 0, "Number of round of hosts to generate")
	flag.IntVar(&container_num, "container_num", 0, "Number of round of containers to generate")
	flag.IntVar(&vuln_num, "vuln_num", 0, "Number of round of vulns to generate")
	flag.IntVar(&vuln_scan_num, "vuln_scan_num", 0, "Number of round of vuln_scans to generate")
	flag.IntVar(&aws_lambda_num, "aws_lambda_num", 0, "Number of round of lambda to generate")

	flag.Parse()

	apply(image_num, host_num, container_num, vuln_num, vuln_scan_num, aws_lambda_num)
}

const (
	max_batch_images              = 100_000
	max_batch_hosts               = 1000
	max_batch_containers          = 100_000
	max_batch_vulenrabilities     = 1000
	max_batch_vulenrability_scans = 100_000
	max_batch_aws_lambda          = 100_000
)

func apply(image_rounds, hosts_rounds, containers_rounds, vuln_rounds, vuln_scan_rounds, aws_lambda_rounds int) {

	images := [][]map[string]interface{}{}
	for round := 0; round < image_rounds; round += 1 {
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
			"docker_image_name":                 "quay.io/deepfenceio/deepfence_agent_ce",
			"user_defined_tags":                 "",
			"node_id":                           "",
		}

		images = append(images, populate(base_image, max_batch_images, round))
	}

	hosts := [][]map[string]interface{}{}
	for round := 0; round < hosts_rounds; round += 1 {
		base_host := map[string]interface{}{
			"vulnerabilities_count":   80,
			"cloud_region":            "Serverless",
			"kubernetes_cluster_name": "",
			"control_probe_id":        "17919ef2ef95d01d",
			"host_node_id":            "flac-desktop;<host>",
			"node_type":               "host",
			"updated_at":              time.Now().Unix(),
			"sum_cve":                 170,
			"interface_ips":           "{\"172.17.0.1\":\"255.255.0.0\",\"192.168.1.4\":\"255.255.255.0\",\"192.168.122.1\":\"255.255.255.0\"}",
			"sum_secrets":             0,
			"cloud_metadata":          "{\"cloud_provider\":\"Serverless\",\"public_ip\":[\"192.168.1.4\"],\"private_ip\":null,\"label\":\"Private Cloud\",\"region\":\"Serverless\"}",
			"os":                      "linux",
			"kubernetes_cluster_id":   "",
			"probeId":                 "17919ef2ef95d01d",
			"compliances_count":       0,
			"cloud_provider":          "Serverless",
			"is_ui_vm":                "false",
			"interfaceNames":          "lo;enp3s0;virbr0;docker0",
			"agent_running":           "yes",
			"version":                 "v1.4.2-933b2229-1678120065060323",
			"uptime":                  "119863",
			"depth":                   1,
			"kernel_version":          "6.1.0-5-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.12-1 (2023-02-15)",
			"secrets_count":           0,
			"sum_compliance":          0,
			"user_defined_tags":       "",
			"host_name":               "flac-desktop",
			"ts":                      "2023-03-07T09:14:30.986914443Z",
			"node_id":                 "flac-desktop",
		}
		hosts = append(hosts, populate(base_host, max_batch_hosts, round))
	}

	containers := [][]map[string]interface{}{}
	for round := 0; round < containers_rounds; round += 1 {
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

		containers = append(containers, populate(base_container, max_batch_containers, round))
	}

	vulnerabilities := [][]map[string]interface{}{}
	for round := 0; round < vuln_rounds; round += 1 {
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

		vulnerabilities = append(vulnerabilities, populate(base_vulnerability, max_batch_vulenrabilities, round))
	}

	vulnerability_scans := [][]map[string]interface{}{}
	for round := 0; round < vuln_scan_rounds; round += 1 {
		base_vulnerability_scan := map[string]interface{}{
			"retries":        0,
			"updated_at":     time.Now().Unix(),
			"trigger_action": "{\"id\":0,\"request_payload\":\"{\"node_id\":\"3f8a00f137a0d2c8a2163a09901e28e2471999fde4efc2f9570b91f1c30acf94\",\"node_type\":1,\"bin_args\":{\"image_name\":\"nginx:latest\",\"node_id\":\"3f8a00f137a0d2c8a2163a09901e28e2471999fde4efc2f9570b91f1c30acf94\",\"node_type\":\"image\",\"registry_id\":\"\",\"scan_id\":\"3f8a00f137a0d2c8a2163a09901e28e2471999fde4efc2f9570b91f1c30acf94-1676448786\",\"scan_type\":\"all\"}}\"}",
			"status":         "COMPLETE",
			"node_id":        "3f8a00f137a0d2c8a2163a09901e28e2471999fde4efc2f9570b91f1c30acf94-1676448786",
		}

		vulnerability_scans = append(vulnerability_scans, populate(base_vulnerability_scan, max_batch_vulenrability_scans, round))
	}

	aws_lambdas := [][]map[string]interface{}{}
	for round := 0; round < aws_lambda_rounds; round += 1 {
		base_aws_lambda := map[string]interface{}{
			"node_id":        "arn:lambda",
			"cloud_provider": "aws",
			"cloud_region":   "us-east-1",
			"node_type":      "aws_lambda_function",
		}

		aws_lambdas = append(aws_lambdas, populate(base_aws_lambda, max_batch_aws_lambda, round))
	}

	log.Println("Data ready to be ingested")

	tc, err := neo4j.NewDriver("bolt://"+console_ip+":7687", neo4j.BasicAuth("neo4j", console_pass, ""))
	if err != nil {
		log.Fatal(err)
	}

	session, err := tc.Session(neo4j.AccessModeWrite)
	if err != nil {
		log.Fatal(err)
	}

	defer session.Close(ctx)

	log.Println("Starting ingestion")

	for i := range images {

		log.Printf("Processing %v / %v\n", i, len(images))
		_, err = session.Run(ctx, `
		UNWIND $images as row
		MERGE (n:ContainerImage{node_id:row.node_id})
		SET n += row`,
			map[string]interface{}{"images": images[i]})
		if err != nil {
			log.Fatal(err)
		}
	}

	log.Println("images done")

	for i := range hosts {
		log.Printf("Processing %v / %v\n", i, len(hosts))
		_, err = session.Run(ctx, `
		UNWIND $hosts as row
		MERGE (cp:CloudProvider{node_id: row.cloud_provider})
		MERGE (cr:CloudRegion{node_id: row.cloud_region})
		MERGE (cp) -[:HOSTS]-> (cr)
		MERGE (n:Node{node_id:row.node_id})
		MERGE (cr) -[:HOSTS]-> (n)
		SET n += row, cp.active = true, cp.pseudo = false, cr.active = true, n.active = true`,
			map[string]interface{}{"hosts": hosts[i]})
		if err != nil {
			log.Fatal(err)
		}
	}

	log.Println("hosts done")

	for i := range containers {
		log.Printf("Processing %v / %v\n", i, len(containers))
		_, err = session.Run(ctx, `
		UNWIND $containers as row
		MERGE (n:Container{node_id:row.node_id})
		SET n += row`,
			map[string]interface{}{"containers": containers[i]})
		if err != nil {
			log.Fatal(err)
		}
	}

	log.Println("containers done")

	for i := range vulnerabilities {
		log.Printf("Processing %v / %v\n", i, len(vulnerabilities))
		_, err = session.Run(ctx, `
		UNWIND $vulnerabilities as row
		MERGE (n:Vulnerability{node_id:row.node_id})
		SET n += row`,
			map[string]interface{}{"vulnerabilities": vulnerabilities[i]})
		if err != nil {
			log.Fatal(err)
		}
	}

	for i := range vulnerability_scans {
		log.Printf("Processing %v / %v\n", i, len(vulnerability_scans))
		_, err = session.Run(ctx, `
		UNWIND $vulnerability_scans as row
		MERGE (n:VulnerabilityScan{node_id:row.node_id})
		SET n += row`,
			map[string]interface{}{"vulnerability_scans": vulnerability_scans[i]})
		if err != nil {
			log.Fatal(err)
		}
	}

	log.Println("vulnerabilities done")

	for i := range aws_lambdas {
		log.Printf("Processing %v / %v\n", i, len(aws_lambdas))
		_, err = session.Run(ctx, `
		UNWIND $batch as row
		MERGE (cp:CloudProvider{node_id: row.cloud_provider})
		MERGE (cr:CloudRegion{node_id: row.cloud_region})
		MERGE (cp) -[:HOSTS]-> (cr)
		MERGE (n:CloudResource{node_id:row.node_id})
		MERGE (cr) -[:HOSTS] -> (n)
		SET n += row, cp.active = true, cp.pseudo = false, cr.active = true, n.active = true`,
			map[string]interface{}{"batch": aws_lambdas[i]})
		if err != nil {
			log.Fatal(err)
		}
	}

	log.Println("Added all nodes")

	link_host_container_image := [][]map[string]string{}
	for n := 0; n < hosts_rounds; n += 1 {
		round_link_host_container_image := []map[string]string{}
		for i := n * max_batch_hosts; i < (n+1)*max_batch_hosts; i++ {
			for j := 0; j < 100; j++ {
				round_link_host_container_image = append(round_link_host_container_image,
					map[string]string{"left": strconv.Itoa(i), "right": strconv.Itoa(i*100 + j)})
			}
		}
		link_host_container_image = append(link_host_container_image, round_link_host_container_image)
	}

	for i := range link_host_container_image {
		log.Printf("Processing %v / %v\n", i, len(link_host_container_image))
		_, err = session.Run(ctx, `
		UNWIND $links as row
		MATCH (n:Node{node_id:row.left})
		MATCH (m:ContainerImage{node_id:row.right})
		MERGE (n) -[:HOSTS]->(m)`,
			map[string]interface{}{"links": link_host_container_image[i]})
		if err != nil {
			log.Fatal(err)
		}
	}

	fmt.Printf("Linked 1\n")
	link_host_container := [][]map[string]string{}
	for n := 0; n < hosts_rounds; n += 1 {
		round_link_host_container := []map[string]string{}
		for i := n * max_batch_hosts; i < (n+1)*max_batch_hosts; i++ {
			for j := 0; j < 100; j++ {
				round_link_host_container = append(round_link_host_container,
					map[string]string{"left": strconv.Itoa(i), "right": strconv.Itoa(i*100 + j)})
			}
		}
		link_host_container = append(link_host_container, round_link_host_container)
	}

	for i := range link_host_container {
		log.Printf("Processing %v / %v\n", i, len(link_host_container))
		_, err = session.Run(ctx, `
		UNWIND $links as row
		MATCH (n:Node{node_id:row.left})
		MATCH (m:Container{node_id:row.right})
		MERGE (n) -[:HOSTS]->(m)`,
			map[string]interface{}{"links": link_host_container[i]})
		if err != nil {
			log.Fatal(err)
		}
	}

	fmt.Printf("Linked 2\n")

	_, err = session.Run(ctx, `
		MATCH (n:ContainerImage)
		MATCH (m:VulnerabilityScan{node_id: n.node_id})
		MERGE (m) -[:SCANNED]->(n)`,
		map[string]interface{}{})

	if err != nil {
		log.Fatal(err)
	}

	_, err = session.Run(ctx, `
		MATCH (n:Node)
		MATCH (m:VulnerabilityScan{node_id: n.node_id})
		MERGE (m) -[:SCANNED]->(n)`,
		map[string]interface{}{})

	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Linked 3\n")

	link_vuln_scan := [][]map[string]string{}
	for n := 0; n < hosts_rounds; n += 1 {
		round_link_vuln_scan := []map[string]string{}
		for i := 0; i < max_batch_vulenrability_scans; i++ {
			for j := 0; j < 10; j++ {
				round_link_vuln_scan = append(round_link_vuln_scan,
					map[string]string{"left": strconv.Itoa(i), "right": strconv.Itoa((i*10 + j) % max_batch_vulenrabilities)})
			}
		}
		link_vuln_scan = append(link_vuln_scan, round_link_vuln_scan)
	}

	for i := range link_vuln_scan {
		log.Printf("Processing %v / %v\n", i, len(link_vuln_scan))
		_, err = session.Run(ctx, `
		UNWIND $links as row
		MATCH (n:VulnerabilityScan{node_id:row.left})
		MATCH (m:Vulnerability{node_id:row.right})
		MERGE (m) -[:DETECTED]->(n)`,
			map[string]interface{}{"links": link_vuln_scan[i]})
		if err != nil {
			log.Fatal(err)
		}
	}

	fmt.Printf("Linked all nodes\n")
}
