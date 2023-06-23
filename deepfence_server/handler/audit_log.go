package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	postgresql_db "github.com/deepfence/golang_deepfence_sdk/utils/postgresql/postgresql-db"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/go-chi/jwtauth/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/lestrrat-go/jwx/v2/jwt"
	"github.com/twmb/franz-go/pkg/kgo"
)

const (
	EVENT_COMPLIANCE_SCAN    = string(utils.NEO4J_COMPLIANCE_SCAN)
	EVENT_VULNERABILITY_SCAN = string(utils.NEO4J_VULNERABILITY_SCAN)
	EVENT_SECRET_SCAN        = string(utils.NEO4J_SECRET_SCAN)
	EVENT_MALWARE_SCAN       = string(utils.NEO4J_MALWARE_SCAN)
	EVENT_INTEGRATION        = "integration"
	EVENT_AUTH               = "auth"
	EVENT_REPORTS            = "reports"
	EVENT_SETTINGS           = "settings"
	EVENT_REGISTRY           = "registry"
	ACTION_START             = "start"
	ACTION_STOP              = "stop"
	ACTION_LOGOUT            = "logout"
	ACTION_LOGIN             = "login"
	ACTION_INVITE            = "invite"
	ACTION_INTERRUPT         = "interrupt"
	ACTION_CREATE            = "create"
	ACTION_UPDATE            = "update"
	ACTION_DELETE            = "delete"
	ACTION_ENABLE            = "enable"
	ACTION_DISABLE           = "disable"
	ACTION_BULK              = "bulk"
	ACTION_DOWNLOAD          = "download"
	ACTION_NOTIFY            = "notify"
	ACTION_RESET_PASSWORD    = "reset_password"
	ACTION_VERIFY_PASSWORD   = "verify_password"
	ACTION_RESET_TOKEN       = "reset_token"
	ACTION_TOKEN_AUTH        = "token_auth"
	ACTION_LOGS              = "logs"
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

	var (
		userEmail string
		userRole  string
		claims    = map[string]interface{}{}
	)

	token, err := GetTokenFromRequest(h.TokenAuth, req)
	if err != nil {
		if !errors.Is(err, jwtauth.ErrNoTokenFound) {
			log.Error().Msg(err.Error())
		}
	} else {
		claims = token.PrivateClaims()
		userEmail = claims["email"].(string)
		userRole = claims["role"].(string)
	}

	if event == EVENT_AUTH && (action == ACTION_LOGIN || action == ACTION_TOKEN_AUTH) {
		user := resources.(*model.User)
		userEmail = user.Email
		userRole = user.Role
	}

	var resourceStr string = ""
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

	go h.AddAuditLog(params)
}

func (h *Handler) AddAuditLog(params postgresql_db.CreateAuditLogParams) error {
	data, err := json.Marshal(params)
	if err != nil {
		return err
	}

	h.IngestChan <- &kgo.Record{
		Topic: utils.AUDIT_LOGS,
		Value: data,
	}

	return nil
}

func (h *Handler) GetAuditLogs(w http.ResponseWriter, r *http.Request) {
	ctx := directory.WithGlobalContext(r.Context())
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Err(err).Msg("failed to get db connection")
		respondError(err, w)
		return
	}

	auditLogs, err := pgClient.GetAuditLogs(ctx)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(err, w)
		return
	}

	if len(auditLogs) == 0 {
		//This is to handle when there's no data in DB
		auditLogs = make([]postgresql_db.GetAuditLogsRow, 0)
	}

	err = httpext.JSON(w, http.StatusOK, auditLogs)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}
