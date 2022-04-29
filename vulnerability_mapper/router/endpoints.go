package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Simple ping-pong router for readiness and liveness checks
func addPingRoutes(r *gin.Engine) {
	ping := r.Group("/vulnerability-mapper-api/ping")

	ping.GET("", func(c *gin.Context) {
		c.String(http.StatusOK, "pong")
	})
}

func addVulnerabilityService(r *gin.Engine) {
	vulnerabilityScan := r.Group("/vulnerability-mapper-api/vulnerability-scan")

	vulnerabilityScan.POST("", vulnerabilityScanController.Scan) // : probe
}

func addDBUpdateService(r *gin.Engine) {
	vulnerabilityScan := r.Group("/vulnerability-mapper-api/db-update")
	vulnerabilityScan.POST("", VulnerabilityDBUpdateController.UpdateDB)
}
