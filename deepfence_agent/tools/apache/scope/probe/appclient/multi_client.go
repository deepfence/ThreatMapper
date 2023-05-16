package appclient

import (
	"net/url"

	"github.com/weaveworks/scope/report"
)

// MultiAppClient maintains a set of upstream apps, and ensures we have an
// AppClient for each one.
type MultiAppClient interface {
	Set(hostname string, urls []url.URL)
	Stop()
	Publish(r report.Report) error
}
