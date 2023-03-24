package report

// DNSRecord contains names that an IP address maps to
type DNSRecord struct {
	Forward StringSet `json:"forward,omitempty"`
	Reverse StringSet `json:"reverse,omitempty"`
}

// DNSRecords contains all address->name mappings for a report
type DNSRecords map[string]DNSRecord

// FirstMatch returns the first DNS name where match() returns true
func (r DNSRecords) FirstMatch(id string, match func(name string) string) (string, string) {
	_, addr, _, ok := ParseEndpointNodeID(id)
	if !ok {
		return "", ""
	}
	// we rely on StringSets being sorted, to make selection deterministic
	// prioritize forward names
	for _, hostname := range r[addr].Forward {
		serviceType := match(hostname)
		if serviceType != "" {
			return hostname, serviceType
		}
	}
	for _, hostname := range r[addr].Reverse {
		serviceType := match(hostname)
		if serviceType != "" {
			return hostname, serviceType
		}
	}
	return "", ""
}
