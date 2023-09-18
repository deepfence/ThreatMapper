package sbom

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"os"
	"path"
	"strings"
	"sync"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/ThreeDotsLabs/watermill/message/router/middleware"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/deepfence/ThreatMapper/deepfence_worker/cronjobs"
	workerUtils "github.com/deepfence/ThreatMapper/deepfence_worker/utils"
	"github.com/deepfence/package-scanner/sbom/syft"
	psUtils "github.com/deepfence/package-scanner/utils"
	"github.com/minio/minio-go/v7"
	"github.com/twmb/franz-go/pkg/kgo"
)

var (
	syftBin = "syft"
	scanMap = sync.Map{}
)

type SbomGenerator struct {
	ingestC chan *kgo.Record
}

func NewSbomGenerator(ingest chan *kgo.Record) SbomGenerator {
	return SbomGenerator{ingestC: ingest}
}

func StopVulnerabilityScan(msg *message.Message) error {
	log.Info().Msgf("StopVulnerabilityScan, uuid: %s payload: %s ", msg.UUID, string(msg.Payload))
	var params utils.SbomParameters
	if err := json.Unmarshal(msg.Payload, &params); err != nil {
		log.Error().Msgf("StopVulnerabilityScan, error in Unmarshal: %s", err.Error())
		return nil
	}

	scanID := params.ScanId
	cancelFnObj, found := scanMap.Load(scanID)
	logMsg := ""
	if found {
		cancelFn := cancelFnObj.(context.CancelFunc)
		cancelFn()
		logMsg = "Stop GenerateSBOM request submitted"
	} else {
		logMsg = "Failed to Stop scan, SBOM may have already generated or errored out"
	}

	log.Info().Msgf("%s, scan_id: %s", logMsg, scanID)
	return nil
}

func (s SbomGenerator) GenerateSbom(msg *message.Message) ([]*message.Message, error) {
	defer cronjobs.ScanWorkloadAllocator.Free()

	var params utils.SbomParameters

	tenantID := msg.Metadata.Get(directory.NamespaceKey)
	if len(tenantID) == 0 {
		log.Error().Msg("tenant-id/namespace is empty")
		return nil, directory.ErrNamespaceNotFound
	}
	log.Info().Msgf("message tenant id %s", string(tenantID))

	rh := []kgo.RecordHeader{
		{Key: "namespace", Value: []byte(tenantID)},
	}

	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(tenantID))

	log.Info().Msgf("uuid: %s payload: %s ", msg.UUID, string(msg.Payload))

	if err := json.Unmarshal(msg.Payload, &params); err != nil {
		log.Error().Msg(err.Error())
		SendScanStatus(s.ingestC, NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error(), nil), rh)
		return nil, nil
	}

	if params.RegistryId == "" {
		log.Error().Msgf("registry id is empty in params %+v", params)
		SendScanStatus(s.ingestC, NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED,
			"registry id is empty in params", nil), rh)
		return nil, nil
	}

	statusChan := make(chan SbomScanStatus)
	var wg sync.WaitGroup
	wg.Add(1)
	StartStatusReporter("SBOM_GENERATION", statusChan, s.ingestC, rh, params, &wg)
	defer wg.Wait()

	// send inprogress status
	statusChan <- NewSbomScanStatus(params, utils.SCAN_STATUS_INPROGRESS, "", nil)

	// get registry credentials
	authFile, creds, err := workerUtils.GetConfigFileFromRegistry(ctx, params.RegistryId)
	if err != nil {
		log.Error().Msg(err.Error())
		statusChan <- NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error(), nil)
		return nil, nil
	}

	log.Info().Msgf("Adding scanid to map:%s", params.ScanId)
	ctxSbom, cancel := context.WithCancel(context.Background())
	scanMap.Store(params.ScanId, cancel)
	defer func(scanId string) {
		log.Info().Msgf("Removing scaind from map:%s", scanId)
		scanMap.Delete(scanId)
	}(params.ScanId)

	defer func() {
		log.Info().Msgf("remove auth directory %s", authFile)
		if err := os.RemoveAll(authFile); err != nil {
			log.Error().Msg(err.Error())
		}
	}()

	// generate sbom
	cfg := psUtils.Config{
		SyftBinPath:           syftBin,
		HostName:              params.HostName,
		NodeType:              "container_image", // this is required by package scanner
		NodeId:                params.NodeId,
		KubernetesClusterName: params.KubernetesClusterName,
		ScanId:                params.ScanId,
		ImageId:               params.ImageId,
		ContainerName:         params.ContainerName,
		RegistryId:            params.RegistryId,
		RegistryCreds: psUtils.RegistryCreds{
			AuthFilePath:  authFile,
			SkipTLSVerify: creds.SkipTLSVerify,
			UseHttp:       creds.UseHttp,
		},
	}

	if params.ImageName != "" {
		if creds.ImagePrefix != "" {
			cfg.Source = creds.ImagePrefix + "/" + params.ImageName
		} else {
			cfg.Source = params.ImageName
		}
	} else {
		cfg.Source = params.ImageId
	}

	log.Debug().Msgf("config: %+v", cfg)

	statusChan <- NewSbomScanStatus(params, utils.SCAN_STATUS_INPROGRESS, "", nil)

	rawSbom, err := syft.GenerateSBOM(ctxSbom, cfg)
	if err != nil {
		if ctxSbom.Err() == context.Canceled {
			log.Error().Msgf("Stopping GenerateSBOM as per user request, scanID:%s", params.ScanId)
			statusChan <- NewSbomScanStatus(params, utils.SCAN_STATUS_CANCELLED, err.Error(), nil)
		} else {
			log.Error().Msg(err.Error())
			statusChan <- NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error(), nil)
		}

		return nil, nil
	}

	gzpb64Sbom := bytes.Buffer{}
	gzipwriter := gzip.NewWriter(&gzpb64Sbom)
	_, err = gzipwriter.Write(rawSbom)
	if err != nil {
		log.Error().Msg(err.Error())
		statusChan <- NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error(), nil)
		return nil, nil
	}
	gzipwriter.Close()

	// upload sbom to minio
	mc, err := directory.MinioClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		statusChan <- NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error(), nil)
		return nil, nil
	}

	sbomFile := path.Join("/sbom/", utils.ScanIdReplacer.Replace(params.ScanId)+".json.gz")
	info, err := mc.UploadFile(ctx, sbomFile, gzpb64Sbom.Bytes(),
		minio.PutObjectOptions{ContentType: "application/gzip"})

	if err != nil {
		logError := true
		if strings.Contains(err.Error(), "Already exists here") {
			/*If the file already exists, we will delete the old file and upload the new one
			File can exists in 2 conditions:
			- When the earlier scan was stuck during the scan phase
			- When the service was restarted
			- Bug/Race conditon in the worker service
			*/
			log.Warn().Msg(err.Error() + ", Will try to overwrite the file: " + sbomFile)
			err = mc.DeleteFile(ctx, sbomFile, true, minio.RemoveObjectOptions{ForceDelete: true})
			if err == nil {
				info, err = mc.UploadFile(ctx, sbomFile, gzpb64Sbom.Bytes(),
					minio.PutObjectOptions{ContentType: "application/gzip"})

				if err == nil {
					log.Info().Msgf("Successfully overwritten the file: %s", sbomFile)
					logError = false
				} else {
					log.Error().Msgf("Failed to upload the file, error is: %v", err)
				}
			} else {
				log.Error().Msgf("Failed to delete the old file, error is: %v", err)
			}
		}

		if logError == true {
			log.Error().Msg(err.Error())
			statusChan <- NewSbomScanStatus(params, utils.SCAN_STATUS_FAILED, err.Error(), nil)
			return nil, nil
		}
	}

	log.Info().Msgf("sbom file uploaded %+v", info)

	// write sbom to minio and return details another task will scan sbom

	statusChan <- NewSbomScanStatus(params, SBOM_GENERATED, "", nil)

	params.SBOMFilePath = sbomFile

	payload, err := json.Marshal(params)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, nil
	}

	scanMsg := message.NewMessage(watermill.NewUUID(), payload)
	scanMsg.Metadata = map[string]string{directory.NamespaceKey: tenantID}
	middleware.SetCorrelationID(watermill.NewShortUUID(), scanMsg)

	return []*message.Message{scanMsg}, nil
}
