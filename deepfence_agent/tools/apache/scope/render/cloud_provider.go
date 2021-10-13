package render

import (
	"github.com/weaveworks/scope/report"
)

var CloudProviderRenderer = renderParents(
	report.Host, []string{report.CloudProvider}, "",
	HostRenderer,
)

var CloudRegionRenderer = renderParents(
	report.Host, []string{report.CloudRegion}, "",
	HostRenderer,
)
