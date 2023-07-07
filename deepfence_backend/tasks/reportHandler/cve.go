package main

import (
	"context"
	"crypto/md5"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"sync"

	"github.com/olivere/elastic/v7"
)

var (
	maskedCVE     = map[string]Nodes{}
	maskedCVELock = sync.RWMutex{}
)

type dfCveStruct struct {
	Count                      int     `json:"count"`
	Timestamp                  string  `json:"@timestamp"`
	CveTuple                   string  `json:"cve_id_cve_severity_cve_container_image"`
	DocId                      string  `json:"doc_id"`
	Masked                     string  `json:"masked"`
	Type                       string  `json:"type"`
	Host                       string  `json:"host"`
	HostName                   string  `json:"host_name"`
	ImageName                  string  `json:"image_name"`
	KubernetesClusterName      string  `json:"kubernetes_cluster_name"`
	NodeType                   string  `json:"node_type"`
	Scan_id                    string  `json:"scan_id"`
	Cve_id                     string  `json:"cve_id"`
	Cve_type                   string  `json:"cve_type"`
	Cve_container_image        string  `json:"cve_container_image"`
	Cve_container_image_id     string  `json:"cve_container_image_id"`
	Cve_container_name         string  `json:"cve_container_name"`
	Cve_severity               string  `json:"cve_severity"`
	Cve_caused_by_package      string  `json:"cve_caused_by_package"`
	Cve_caused_by_package_path string  `json:"cve_caused_by_package_path"`
	Cve_container_layer        string  `json:"cve_container_layer"`
	Cve_fixed_in               string  `json:"cve_fixed_in"`
	Cve_link                   string  `json:"cve_link"`
	Cve_description            string  `json:"cve_description"`
	Cve_cvss_score             float64 `json:"cve_cvss_score"`
	Cve_overall_score          float64 `json:"cve_overall_score"`
	Cve_attack_vector          string  `json:"cve_attack_vector"`
	RegistryId                 string  `json:"registry_id"`
}

type Nodes map[string]string

func isMaskedCVE(cve dfCveStruct) bool {
	maskedCVELock.RLock()
	defer maskedCVELock.RUnlock()
	nodes, ok := maskedCVE[cve.Cve_id]
	if ok && len(nodes) > 0 {
		// check if only particular image is masked
		nodeType, found := nodes[cve.Cve_container_image]
		if found && nodeType == cve.NodeType {
			return true
		} else {
			return false
		}
	}
	return ok
}

type MaskDocID struct {
	ID           string `json:"_id"`
	Index        string `json:"_index"`
	Operation    string `json:"operation"`
	AcrossImages bool   `json:"across_images"`
}

func addCVE(cve dfCveStruct, acrossImages bool) {
	maskedCVELock.Lock()
	defer maskedCVELock.Unlock()
	nodes, found := maskedCVE[cve.Cve_id]
	if !found {
		nodes = make(map[string]string)
		if !acrossImages {
			nodes[cve.Cve_container_image] = cve.NodeType
		}
	} else {
		// check len(nodes) == 0 because this cve is already masked across images
		if acrossImages || len(nodes) == 0 {
			nodes = make(map[string]string)
		} else {
			nodes[cve.Cve_container_image] = cve.NodeType
		}
	}
	maskedCVE[cve.Cve_id] = nodes
	_, err := getCVE(pgDB, cve.Cve_id)
	if err != nil && errors.Is(err, sql.ErrNoRows) {
		if err := insertCVE(pgDB, cve.Cve_id, nodes); err != nil {
			log.Error(err)
		}
	} else {
		if err := updateCVE(pgDB, cve.Cve_id, nodes); err != nil {
			log.Error(err)
		}
	}
}

func removeCVE(cve dfCveStruct) {
	maskedCVELock.Lock()
	defer maskedCVELock.Unlock()
	_, found := maskedCVE[cve.Cve_id]
	if found {
		delete(maskedCVE, cve.Cve_id)
		if err := deleteCVE(pgDB, cve.Cve_id); err != nil {
			log.Error(err)
		}
	}
}

func startMaskCVE(ctx context.Context, client *elastic.Client, mchan chan MaskDocID) {
	for {
		select {
		case <-ctx.Done():
			log.Info("stop processing masked cve requests")
			return

		case mid := <-mchan:
			doc, err := elastic.NewGetService(client).
				Index(mid.Index).Id(mid.ID).Do(ctx)
			if err != nil {
				checkElasticError(err)
				break
			}
			var cveStruct dfCveStruct
			err = json.Unmarshal(doc.Source, &cveStruct)
			if err != nil {
				log.Error(err)
				break
			}
			switch mid.Operation {
			case "mask":
				addCVE(cveStruct, mid.AcrossImages)
			case "unmask":
				removeCVE(cveStruct)
			}
		}
	}
}

func processCVE(cve []byte, bulkp *elastic.BulkProcessor) {
	var cveStruct dfCveStruct
	err := json.Unmarshal(cve, &cveStruct)
	if err != nil {
		log.Errorf("error unmarshal cve: %s", err)
		return
	}
	cveStruct.Timestamp = getCurrentTime()
	if cveStruct.Cve_severity != "critical" && cveStruct.Cve_severity != "high" && cveStruct.Cve_severity != "medium" {
		cveStruct.Cve_severity = "low"
	}
	cveStruct.Count = 1
	cveStruct.CveTuple = fmt.Sprintf("%s|%s|%s", cveStruct.Cve_id, cveStruct.Cve_severity, cveStruct.Cve_container_image)
	docId := fmt.Sprintf("%x", md5.Sum([]byte(cveStruct.Scan_id+cveStruct.Cve_caused_by_package+cveStruct.Cve_container_image+cveStruct.Cve_id)))
	cveStruct.DocId = docId

	// check if cve masked
	if isMaskedCVE(cveStruct) {
		cveMasked.Inc()
		cveStruct.Masked = "true"
	} else {
		cveStruct.Masked = "false"
	}

	event, err := json.Marshal(cveStruct)
	if err != nil {
		log.Errorf("error marshal updated cve data: %s", err)
		return
	} else {
		// bulkp.Add(elastic.NewBulkIndexRequest().Index(cveIndexName).
		// 	Id(docId).Pipeline("cve_map_pipeline").Doc(cveStruct))
		bulkp.Add(elastic.NewBulkUpdateRequest().Index(cveIndexName).
			Id(docId).Script(elastic.NewScriptStored("default_upsert").Param("event", cveStruct)).
			Upsert(cveStruct).ScriptedUpsert(true).RetryOnConflict(3))
		// publish after updating cve
		vulnerabilityTaskQueue <- event
	}
}
