package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	reporters_search "github.com/deepfence/ThreatMapper/deepfence_server/reporters/search"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresql_db "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/go-chi/jwtauth/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/lestrrat-go/jwx/v2/jwt"
	"github.com/twmb/franz-go/pkg/kgo"
)

const (
	EventComplianceScan          = string(utils.NEO4JComplianceScan)
	EventVulnerabilityScan       = string(utils.NEO4JVulnerabilityScan)
	EventSecretScan              = string(utils.NEO4JSecretScan)
	EventMalwareScan             = string(utils.NEO4JMalwareScan)
	EventIntegration             = "integration"
	EventGenerativeAIIntegration = "generative-ai-integration"
	EventAuth                    = "auth"
	EventReports                 = "reports"
	EventSettings                = "settings"
	EventRegistry                = "registry"
	ActionStart                  = "start"
	ActionStop                   = "stop"
	ActionLogout                 = "logout"
	ActionLogin                  = "login"
	ActionInvite                 = "invite"
	ActionInterrupt              = "interrupt"
	ActionCreate                 = "create"
	ActionUpdate                 = "update"
	ActionDelete                 = "delete"
	ActionEnable                 = "enable"
	ActionDisable                = "disable"
	ActionBulk                   = "bulk"
	ActionDownload               = "download"
	ActionNotify                 = "notify"
	ActionResetPassword          = "reset_password"
	ActionVerifyPassword         = "verify_password"
	ActionResetToken             = "reset_token"
	ActionTokenAuth              = "token_auth"
	ActionLogs                   = "logs"
)

func GetTokenFromRequest(ja *jwtauth.JWTAuth, r *http.Request) (jwt.Token, error) {
	var tokenString string

	findTokenFns := []func(r *http.Request) string{
		jwtauth.TokenFromHeader,
		jwtauth.TokenFromCookie,
	}

	for _, fn := range findTokenFns {
		tokenString = fn(r)
		if tokenString != "" {
			break
		}
	}
	if tokenString == "" {
		return nil, jwtauth.ErrNoTokenFound
	}

	return ja.Decode(tokenString)
}

func (h *Handler) AuditUserActivity(
	req *http.Request,
	event string,
	action string,
	resources interface{},
	success bool,
) {

	_, span := telemetry.NewSpan(req.Context(), "audit-log", "audit-user-activity")
	defer span.End()

	var (
		userEmail string
		userRole  string
		namespace string
		claims    = map[string]interface{}{}
	)

	token, err := GetTokenFromRequest(h.TokenAuth, req)
	if err != nil {
		if !errors.Is(err, jwtauth.ErrNoTokenFound) {
			log.Error().Msg(err.Error())
		}
	} else {
		claims = token.PrivateClaims()
		if claims["email"] == nil || claims["role"] == nil || claims[directory.NamespaceKey] == nil {
			log.Warn().Msg("AuditUserActivity claims value is nil")
			return
		}
		userEmail = claims["email"].(string)
		userRole = claims["role"].(string)
		namespace = claims[directory.NamespaceKey].(string)
	}

	if event == EventAuth && (action == ActionLogin || action == ActionTokenAuth || action == ActionCreate) {
		user := resources.(*model.User)
		userEmail = user.Email
		userRole = user.Role
		namespace = user.CompanyNamespace
	}

	var resourceStr string
	if resources != nil {
		rStr, err := json.Marshal(resources)
		if err != nil {
			log.Error().Err(err).Msg("failed to marshal resources")
			rStr = []byte("")
		}
		resourceStr = string(rStr)
	} else {
		rStr, err := json.Marshal(claims)
		if err != nil {
			log.Error().Err(err).Msg("failed to marshal claims from jwt")
			rStr = []byte("")
		}
		resourceStr = string(rStr)
	}

	params := postgresql_db.CreateAuditLogParams{
		Event:     event,
		Action:    action,
		Resources: resourceStr,
		Success:   success,
		UserEmail: userEmail,
		UserRole:  userRole,
		CreatedAt: time.Now(),
	}

	if namespace == "" {
		log.Error().Msgf("namespace unknown in audit log: %v", params)
		return
	}

	go h.AddAuditLog(namespace, params)
}

func (h *Handler) AddAuditLog(namespace string, params postgresql_db.CreateAuditLogParams) {
	data, err := json.Marshal(params)
	if err != nil {
		log.Error().Msg(err.Error())
		return
	}

	h.IngestChan <- &kgo.Record{
		Topic: utils.AuditLogs,
		Value: data,
		Headers: []kgo.RecordHeader{
			{Key: "namespace", Value: []byte(namespace)},
		},
	}
}

func (h *Handler) GetAuditLogsCount(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Err(err).Msg("failed to get db connection")
		h.respondError(err, w)
		return
	}

	count, err := pgClient.CountAuditLogs(ctx)
	if err != nil {
		log.Error().Err(err).Msg("failed to run CountAuditLogs query")
		h.respondError(err, w)
		return
	}

	err = httpext.JSON(w, http.StatusOK, reporters_search.SearchCountResp{
		Count: int(count),
	})
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) GetAuditLogs(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.GetAuditLogsRequest
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}

	ctx := r.Context()

	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Err(err).Msg("failed to get db connection")
		h.respondError(err, w)
		return
	}

	auditLogs, err := pgClient.GetAuditLogs(ctx, postgresql_db.GetAuditLogsParams{
		Offset: int32(req.Window.Offset),
		Limit:  int32(req.Window.Size),
	})
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
		return
	}

	if len(auditLogs) == 0 {
		// This is to handle when there's no data in DB
		auditLogs = make([]postgresql_db.GetAuditLogsRow, 0)
	}

	err = httpext.JSON(w, http.StatusOK, auditLogs)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}
