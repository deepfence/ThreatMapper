package reports

import (
	"context"

	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

func generateXLSX(ctx context.Context, session neo4j.Session, params utils.ReportParams) (string, error) {
	return "", nil
}
