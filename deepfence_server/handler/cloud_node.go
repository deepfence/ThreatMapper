package handler

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	reporters_scan "github.com/deepfence/ThreatMapper/deepfence_server/reporters/scan"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/sirupsen/logrus"
)

var (
	AWS_DEFAULT_CONTROLS = map[string][]string{
		"cis":   []string{"control.cis_v140_4_1", "control.cis_v140_4_2", "control.cis_v140_4_3", "control.cis_v140_4_4", "control.cis_v140_4_5", "control.cis_v140_4_6", "control.cis_v140_4_7", "control.cis_v140_4_8", "control.cis_v140_4_9", "control.cis_v140_4_10", "control.cis_v140_4_11", "control.cis_v140_4_12", "control.cis_v140_4_13", "control.cis_v140_4_14", "control.cis_v140_4_15", "control.cis_v140_5_1", "control.cis_v140_5_2", "control.cis_v140_5_3", "control.cis_v140_5_4", "control.cis_v140_3_1", "control.cis_v140_3_2", "control.cis_v140_3_3", "control.cis_v140_3_4", "control.cis_v140_3_5", "control.cis_v140_3_6", "control.cis_v140_3_7", "control.cis_v140_3_8", "control.cis_v140_3_9", "control.cis_v140_3_10", "control.cis_v140_3_11", "control.cis_v140_1_1", "control.cis_v140_1_2", "control.cis_v140_1_3", "control.cis_v140_1_4", "control.cis_v140_1_5", "control.cis_v140_1_6", "control.cis_v140_1_7", "control.cis_v140_1_8", "control.cis_v140_1_9", "control.cis_v140_1_10", "control.cis_v140_1_11", "control.cis_v140_1_12", "control.cis_v140_1_13", "control.cis_v140_1_14", "control.cis_v140_1_15", "control.cis_v140_1_16", "control.cis_v140_1_17", "control.cis_v140_1_18", "control.cis_v140_1_19", "control.cis_v140_1_20", "control.cis_v140_1_21", "control.cis_v140_2_1_1", "control.cis_v140_2_1_2", "control.cis_v140_2_1_3", "control.cis_v140_2_1_4", "control.cis_v140_2_1_5", "control.cis_v140_2_2_1", "control.cis_v140_2_3_1"},
		"gdpr":  []string{"benchmark.article_30", "benchmark.article_32", "benchmark.article_25"},
		"hipaa": []string{"benchmark.hipaa_164_308_a_8", "benchmark.hipaa_164_308_a_4_ii_b", "benchmark.hipaa_164_308_a_4_ii_c", "benchmark.hipaa_164_308_a_1_ii_a", "benchmark.hipaa_164_308_a_7_i", "benchmark.hipaa_164_308_a_1_ii_b", "benchmark.hipaa_164_308_a_7_ii_b", "benchmark.hipaa_164_308_a_5_ii_b", "benchmark.hipaa_164_308_a_3_ii_b", "benchmark.hipaa_164_308_a_6_ii", "benchmark.hipaa_164_308_a_7_ii_c", "benchmark.hipaa_164_308_a_3_ii_c", "benchmark.hipaa_164_308_a_4_i", "benchmark.hipaa_164_308_a_5_ii_d", "benchmark.hipaa_164_308_a_5_ii_c", "benchmark.hipaa_164_308_a_4_ii_a", "benchmark.hipaa_164_308_a_1_ii_d", "benchmark.hipaa_164_308_a_3_ii_a", "benchmark.hipaa_164_308_a_3_i", "benchmark.hipaa_164_308_a_6_i", "benchmark.hipaa_164_308_a_7_ii_a", "benchmark.hipaa_164_312_d", "benchmark.hipaa_164_312_a_2_ii", "benchmark.hipaa_164_312_e_2_i", "benchmark.hipaa_164_312_e_1", "benchmark.hipaa_164_312_c_1", "benchmark.hipaa_164_312_a_1", "benchmark.hipaa_164_312_a_2_i", "benchmark.hipaa_164_312_a_2_iv", "benchmark.hipaa_164_312_b", "benchmark.hipaa_164_312_c_2", "benchmark.hipaa_164_312_e_2_ii"},
		"nist":  []string{"benchmark.nist_800_53_rev_4_sc_2", "benchmark.nist_800_53_rev_4_sc_4", "benchmark.nist_800_53_rev_4_sc_5", "benchmark.nist_800_53_rev_4_sc_7", "benchmark.nist_800_53_rev_4_sc_8", "benchmark.nist_800_53_rev_4_sc_12", "benchmark.nist_800_53_rev_4_sc_13", "benchmark.nist_800_53_rev_4_sc_23", "benchmark.nist_800_53_rev_4_sc_28", "benchmark.nist_800_53_rev_4_cp_9", "benchmark.nist_800_53_rev_4_cp_10", "benchmark.nist_800_53_rev_4_ca_7", "benchmark.nist_800_53_rev_4_sa_3", "benchmark.nist_800_53_rev_4_sa_10", "benchmark.nist_800_53_rev_4_si_2_2", "benchmark.nist_800_53_rev_4_si_4", "benchmark.nist_800_53_rev_4_si_7", "benchmark.nist_800_53_rev_4_si_12", "benchmark.nist_800_53_rev_4_ac_2", "benchmark.nist_800_53_rev_4_ac_3", "benchmark.nist_800_53_rev_4_ac_4", "benchmark.nist_800_53_rev_4_ac_5", "benchmark.nist_800_53_rev_4_ac_6", "benchmark.nist_800_53_rev_4_ac_17_1", "benchmark.nist_800_53_rev_4_ac_17_2", "benchmark.nist_800_53_rev_4_ac_17_3", "benchmark.nist_800_53_rev_4_ac_21", "benchmark.nist_800_53_rev_4_ir_4_1", "benchmark.nist_800_53_rev_4_ir_6_1", "benchmark.nist_800_53_rev_4_ir_7_1", "benchmark.nist_800_53_rev_4_ra_5", "benchmark.nist_800_53_rev_4_cm_2", "benchmark.nist_800_53_rev_4_cm_7", "benchmark.nist_800_53_rev_4_cm_8_1", "benchmark.nist_800_53_rev_4_cm_8_3", "benchmark.nist_800_53_rev_4_au_2", "benchmark.nist_800_53_rev_4_au_3", "benchmark.nist_800_53_rev_4_au_6_1", "benchmark.nist_800_53_rev_4_au_6_3", "benchmark.nist_800_53_rev_4_au_7_1", "benchmark.nist_800_53_rev_4_au_9", "benchmark.nist_800_53_rev_4_au_11", "benchmark.nist_800_53_rev_4_au_12", "benchmark.nist_800_53_rev_4_ia_2", "benchmark.nist_800_53_rev_4_ia_5_1", "benchmark.nist_800_53_rev_4_ia_5_4", "benchmark.nist_800_53_rev_4_ia_5_7"},
		"pci":   []string{"control.pci_v321_config_1", "control.pci_v321_dms_1", "control.pci_v321_sagemaker_1", "control.pci_v321_rds_1", "control.pci_v321_rds_2", "control.pci_v321_lambda_1", "control.pci_v321_lambda_2", "control.pci_v321_es_1", "control.pci_v321_es_2", "control.pci_v321_redshift_1", "control.pci_v321_cw_1", "control.pci_v321_elbv2_1", "control.pci_v321_kms_1", "control.pci_v321_ssm_1", "control.pci_v321_ssm_2", "control.pci_v321_ssm_3", "control.pci_v321_codebuild_1", "control.pci_v321_codebuild_2", "control.pci_v321_opensearch_1", "control.pci_v321_opensearch_2", "control.pci_v321_s3_1", "control.pci_v321_s3_2", "control.pci_v321_s3_3", "control.pci_v321_s3_4", "control.pci_v321_s3_5", "control.pci_v321_s3_6", "control.pci_v321_autoscaling_1", "control.pci_v321_cloudtrail_1", "control.pci_v321_cloudtrail_2", "control.pci_v321_cloudtrail_3", "control.pci_v321_cloudtrail_4", "control.pci_v321_guardduty_1", "control.pci_v321_iam_1", "control.pci_v321_iam_2", "control.pci_v321_iam_3", "control.pci_v321_iam_4", "control.pci_v321_iam_5", "control.pci_v321_iam_6", "control.pci_v321_iam_7", "control.pci_v321_iam_8", "control.pci_v321_ec2_1", "control.pci_v321_ec2_2", "control.pci_v321_ec2_3", "control.pci_v321_ec2_4", "control.pci_v321_ec2_5", "control.pci_v321_ec2_6"},
		"soc2":  []string{"benchmark.soc_2_cc_5_1", "benchmark.soc_2_cc_5_2", "benchmark.soc_2_cc_5_3", "benchmark.soc_2_p_2_1", "benchmark.soc_2_p_6_1", "benchmark.soc_2_p_6_2", "benchmark.soc_2_p_6_3", "benchmark.soc_2_p_6_4", "benchmark.soc_2_p_6_5", "benchmark.soc_2_p_6_6", "benchmark.soc_2_p_6_7", "benchmark.soc_2_cc_4_1", "benchmark.soc_2_cc_4_2", "benchmark.soc_2_p_4_1", "benchmark.soc_2_p_4_2", "benchmark.soc_2_p_4_3", "benchmark.soc_2_cc_8_1", "benchmark.soc_2_p_8_1", "benchmark.soc_2_p_3_1", "benchmark.soc_2_p_3_2", "benchmark.soc_2_cc_1_1", "benchmark.soc_2_cc_1_2", "benchmark.soc_2_cc_1_3", "benchmark.soc_2_cc_1_4", "benchmark.soc_2_cc_1_5", "benchmark.soc_2_cc_a_1_1", "benchmark.soc_2_cc_a_1_2", "benchmark.soc_2_cc_a_1_3", "benchmark.soc_2_p_7_1", "benchmark.soc_2_p_1_1", "benchmark.soc_2_cc_9_1", "benchmark.soc_2_cc_9_2", "benchmark.soc_2_cc_2_1", "benchmark.soc_2_cc_2_2", "benchmark.soc_2_cc_2_3", "benchmark.soc_2_cc_6_1", "benchmark.soc_2_cc_6_2", "benchmark.soc_2_cc_6_3", "benchmark.soc_2_cc_6_4", "benchmark.soc_2_cc_6_5", "benchmark.soc_2_cc_6_6", "benchmark.soc_2_cc_6_7", "benchmark.soc_2_cc_6_8", "benchmark.soc_2_p_5_1", "benchmark.soc_2_p_5_2", "benchmark.soc_2_cc_3_1", "benchmark.soc_2_cc_3_2", "benchmark.soc_2_cc_3_3", "benchmark.soc_2_cc_3_4", "benchmark.soc_2_cc_c_1_1", "benchmark.soc_2_cc_c_1_2", "benchmark.soc_2_cc_7_1", "benchmark.soc_2_cc_7_2", "benchmark.soc_2_cc_7_3", "benchmark.soc_2_cc_7_4", "benchmark.soc_2_cc_7_5"},
	}
)

func (h *Handler) RegisterCloudNodeAccountHandler(w http.ResponseWriter, r *http.Request) {
	req, err := extractCloudNodeDetails(w, r)
	if err != nil {
		return
	}

	logrus.Debugf("Register Cloud Node Account Request: %+v", req)

	monitoredAccountIds := req.MonitoredAccountIds
	orgAccountId := req.OrgAccountId
	scanList := make(map[string]model.CloudComplianceScanDetails)
	cloudtrailTrails := make([]model.CloudNodeCloudtrailTrail, 10)
	nodeId := req.NodeId

	ctx := directory.NewContextWithNameSpace(directory.NonSaaSDirKey)

	doRefresh := "false"

	logrus.Debugf("Monitored account ids count: %d", len(monitoredAccountIds))
	if len(monitoredAccountIds) != 0 {
		logrus.Debugf("More than 1 account to be monitored: %+v", monitoredAccountIds)
		if orgAccountId != "" {
			complianceError(w, "Org account id is needed for multi account setup")
			return
		}
		monitoredAccountIds[req.CloudAccount] = nodeId
		node := map[string]interface{}{
			"node_id":        fmt.Sprintf("%s-%s-cloud-org", req.CloudProvider, orgAccountId),
			"cloud_provider": req.CloudProvider,
			"node_name":      orgAccountId,
		}
		err = model.UpsertCloudComplianceNode(ctx, node)
		if err != nil {
			complianceError(w, err.Error())
		}
		for monitoredAccountId, monitoredNodeId := range monitoredAccountIds {
			var monitoredNode map[string]interface{}
			monitoredNode = map[string]interface{}{
				"node_id":        monitoredNodeId,
				"cloud_provider": req.CloudProvider,
				"node_name":      monitoredAccountId,
			}
			err = model.UpsertCloudComplianceNode(ctx, monitoredNode)
			if err != nil {
				complianceError(w, err.Error())
			}
			pendingScansList, err := reporters_scan.GetCloudCompliancePendingScansList(ctx, utils.NEO4J_CLOUD_COMPLIANCE_SCAN, monitoredNodeId)
			if err != nil {
				continue
			}
			for _, scan := range pendingScansList.ScansInfo {
				controls, _ := AWS_DEFAULT_CONTROLS[scan.BenchmarkType]
				scanDetail := model.CloudComplianceScanDetails{
					ScanId:    scan.ScanId,
					ScanType:  scan.BenchmarkType,
					AccountId: monitoredNodeId,
					Controls:  controls,
				}
				scanList[scan.ScanId] = scanDetail
			}
		}
	} else {
		logrus.Debugf("Single account monitoring for node: %s", nodeId)
		node := map[string]interface{}{
			"node_id":        nodeId,
			"cloud_provider": req.CloudProvider,
			"node_name":      req.CloudAccount,
		}
		logrus.Debugf("Node for upsert: %+v", node)
		err = model.UpsertCloudComplianceNode(ctx, node)
		if err != nil {
			logrus.Infof("Error while upserting node: %+v", err)
			complianceError(w, err.Error())
		}
		pendingScansList, err := reporters_scan.GetCloudCompliancePendingScansList(ctx, utils.NEO4J_CLOUD_COMPLIANCE_SCAN, nodeId)
		if err != nil || len(pendingScansList.ScansInfo) == 0 {
			logrus.Debugf("No pending scans found for node id: %s", nodeId)
			httpext.JSON(w, http.StatusOK,
				model.CloudNodeAccountRegisterResp{Data: model.CloudNodeAccountRegisterRespData{Scans: scanList,
					CloudtrailTrails: cloudtrailTrails, Refresh: doRefresh}})
			return
		}
		for _, scan := range pendingScansList.ScansInfo {
			controls, _ := AWS_DEFAULT_CONTROLS[scan.BenchmarkType]
			scanDetail := model.CloudComplianceScanDetails{
				ScanId:    scan.ScanId,
				ScanType:  scan.BenchmarkType,
				AccountId: req.CloudAccount,
				Controls:  controls,
			}
			scanList[scan.ScanId] = scanDetail
		}
		logrus.Debugf("Pending scans for node: %+v", scanList)
	}
	logrus.Debugf("Returning response: Scan List %+v cloudtrailTrails %+v Refresh %s", scanList, cloudtrailTrails, doRefresh)
	httpext.JSON(w, http.StatusOK,
		model.CloudNodeAccountRegisterResp{Data: model.CloudNodeAccountRegisterRespData{Scans: scanList,
			CloudtrailTrails: cloudtrailTrails, Refresh: doRefresh}})
	return
}

func (h *Handler) ListCloudNodeAccountHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.CloudNodeAccountsListReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	if utils.StringToCloudProvider(req.CloudProvider) == -1 {
		err = fmt.Errorf("unknown CloudProvider: %s", req.CloudProvider)
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	infos, err := model.GetCloudComplianceNodesList(r.Context(), req.CloudProvider, req.Window)
	if err != nil {
		log.Error().Msgf("%v, req=%v", err, req)
		respondError(err, w)
		return
	}

	httpext.JSON(w, http.StatusOK, infos)
}

func (h *Handler) ListCloudNodeProvidersHandler(w http.ResponseWriter, r *http.Request) {

	providers, err := model.GetCloudProvidersList(r.Context())
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(err, w)
		return
	}

	httpext.JSON(w, http.StatusOK, model.CloudNodeProvidersListResp{Providers: providers})
}

func complianceError(w http.ResponseWriter, errorString string) {
	err := respondError(errors.New(errorString), w)
	if err != nil {
		log.Error().Msgf("%v", err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(errorString))
	}
}

func extractCloudNodeDetails(w http.ResponseWriter, r *http.Request) (model.CloudNodeAccountRegisterReq, error) {
	defer r.Body.Close()
	var req model.CloudNodeAccountRegisterReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return req, err
	}

	if utils.StringToCloudProvider(req.CloudProvider) == -1 {
		err = fmt.Errorf("unknown CloudProvider: %s", req.CloudProvider)
		log.Error().Msgf("%v", err)
		respondError(&NotFoundError{err}, w)
	}

	return req, err
}
