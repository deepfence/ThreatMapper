package handler

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/common"
	"net/http"
)

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	_, _, _ = common.TokenAuth.Encode(map[string]interface{}{})
	return
}
