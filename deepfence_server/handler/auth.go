package handler

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"net/http"
	"time"
)

func (h *Handler) ApiAuthHandler(w http.ResponseWriter, r *http.Request) {

	return
}

func (h *Handler) LoginHandler(w http.ResponseWriter, r *http.Request) {
	_, _, _ = h.TokenAuth.Encode(map[string]interface{}{})
	return
}

func (h *Handler) LogoutHandler(w http.ResponseWriter, r *http.Request) {
	return
}

func (h *Handler) CreatePasswordGrantAccessToken(u *model.User) (string, string, error) {
	accessTokenID := model.GenerateUUID()
	_, s, err := h.TokenAuth.Encode(map[string]interface{}{
		"date":       time.Now().UTC(),
		"expires_in": time.Hour * 24,
		"id":         accessTokenID,
		"user_id":    u.ID,
		"first_name": u.FirstName,
		"last_name":  u.LastName,
		"role":       u.Role,
		"company_id": u.CompanyID,
		"company":    u.Company,
		"email":      u.Email,
		"is_active":  u.IsActive,
		"grant_type": GrantTypePassword,
	})
	if err != nil {
		return "", "", err
	}
	return accessTokenID, s, nil
}

func (h *Handler) CreateRefreshToken(accessTokenID string, userID int64, grantType string) (string, error) {
	_, s, err := h.TokenAuth.Encode(map[string]interface{}{
		"date":       time.Now().UTC(),
		"expires_in": time.Hour * 24 * 7,
		"token_id":   accessTokenID,
		"id":         model.GenerateUUID(),
		"user_id":    userID,
		"grant_type": grantType,
	})
	if err != nil {
		return "", err
	}
	return s, nil
}
