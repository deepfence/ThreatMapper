package render

import (
	"github.com/weaveworks/scope/report"
)

var CloudProviderRenderer = renderParents(
	report.CloudRegion, []string{report.CloudProvider}, "",
	CloudRegionRenderer,
)

var CloudRegionRenderer = renderParents(
	report.Host, []string{report.CloudRegion}, "",
	HostRenderer,
)
