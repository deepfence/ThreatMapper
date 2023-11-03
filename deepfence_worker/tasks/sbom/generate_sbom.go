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
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/deepfence/ThreatMapper/deepfence_worker/cronjobs"
	workerUtils "github.com/deepfence/ThreatMapper/deepfence_worker/utils"
	"github.com/deepfence/golang_deepfence_sdk/utils/tasks"
	"github.com/deepfence/package-scanner/sbom/syft"
	psUtils "github.com/deepfence/package-scanner/utils"
	"github.com/hibiken/asynq"
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

func StopVulnerabilityScan(ctx context.Context, task *asynq.Task) error {
	defer cronjobs.ScanWorkloadAllocator.Free()

	log.Info().Msgf("StopVulnerabilityScan, payload: %s ", string(task.Payload()))
	var params utils.SbomParameters
	if err := json.Unmarshal(task.Payload(), &params); err != nil {
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

func (s SbomGenerator) GenerateSbom(ctx context.Context, task *asynq.Task) error {
	defer cronjobs.ScanWorkloadAllocator.Free()

	var (
		params utils.SbomParameters
		err    error
	)

	tenantID, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return err
	}
	if len(tenantID) == 0 {
		log.Error().Msg("tenant-id/namespace is empty")
		return directory.ErrNamespaceNotFound
	}
	log.Info().Msgf("message tenant id %s", string(tenantID))

	rh := []kgo.RecordHeader{
		{Key: "namespace", Value: []byte(tenantID)},
	}

	log.Info().Msgf("payload: %s ", string(task.Payload()))

	if err := json.Unmarshal(task.Payload(), &params); err != nil {
		return err
	}

	res, scanCtx := tasks.StartStatusReporter(params.ScanId,
		func(status tasks.ScanStatus) error {
			sb, err := json.Marshal(status)
			if err != nil {
				return err
			}
			s.ingestC <- &kgo.Record{
				Topic:   utils.VULNERABILITY_SCAN_STATUS,
				Value:   sb,
				Headers: rh,
			}
			return nil
		}, tasks.StatusValues{
			IN_PROGRESS: utils.SCAN_STATUS_INPROGRESS,
			CANCELLED:   utils.SCAN_STATUS_CANCELLED,
			FAILED:      utils.SCAN_STATUS_FAILED,
			SUCCESS:     utils.SCAN_STATUS_SUCCESS,
		},
		time.Minute*20,
	)

	log.Info().Msgf("Adding scan id to map:%s", params.ScanId)
	scanMap.Store(params.ScanId, scanCtx)
	defer func() {
		log.Info().Msgf("Removing scan id from map:%s", params.ScanId)
		scanMap.Delete(params.ScanId)
		res <- err
		close(res)
	}()

	if params.RegistryId == "" {
		log.Error().Msgf("registry id is empty in params %+v", params)
		return err
	}

	worker, err := directory.Worker(ctx)
	if err != nil {
		return err
	}

	// get registry credentials
	authFile, creds, err := workerUtils.GetConfigFileFromRegistry(ctx, params.RegistryId)
	if err != nil {
		return err
	}

	defer func() {
		log.Info().Msgf("remove auth directory %s", authFile)
		if authFile == "" {
			return
		}
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
		IsRegistry: creds.IsRegistry,
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

	err = scanCtx.Checkpoint("Before generating SBOM")
	if err != nil {
		return err
	}

	rawSbom, err := syft.GenerateSBOM(scanCtx.Context, cfg)
	if err != nil {
		return err
	}

	gzpb64Sbom := bytes.Buffer{}
	gzipwriter := gzip.NewWriter(&gzpb64Sbom)
	_, err = gzipwriter.Write(rawSbom)
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}
	gzipwriter.Close()

	err = scanCtx.Checkpoint("Before storing to minio")
	if err != nil {
		log.Error().Msg(err.Error())
	}

	// upload sbom to minio
	mc, err := directory.MinioClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		return err
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

		if logError {
			log.Error().Msg(err.Error())
			return err
		}
	}

	log.Info().Msgf("sbom file uploaded %+v", info)

	// write sbom to minio and return details another task will scan sbom

	params.SBOMFilePath = sbomFile

	payload, err := json.Marshal(params)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil
	}

	err = worker.Enqueue(utils.ScanSBOMTask, payload, utils.TasksMaxRetries())
	if err != nil {
		return err
	}

	return nil
}
