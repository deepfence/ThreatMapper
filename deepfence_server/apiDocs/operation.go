package apiDocs

import (
	"net/http"
	"time"
)

func (d *OpenApiDocs) AddLoginOperation() {
	type req struct {
		Title  string `json:"string"`
		Amount uint   `json:"amount"`
		Items  []struct {
			Count uint   `json:"count"`
			Name  string `json:"name"`
		} `json:"items"`
	}
	type resp struct {
		ID     string `json:"id" example:"XXX-XXXXX"`
		Amount uint   `json:"amount"`
		Items  []struct {
			Count uint   `json:"count"`
			Name  string `json:"name"`
		} `json:"items"`
		UpdatedAt time.Time `json:"updated_at"`
	}
	d.AddOperation(http.MethodPost, "/deepfence/login", new(req), new(resp))
}
