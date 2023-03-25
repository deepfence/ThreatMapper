package report

import (
	"net"
	"strconv"
	"strings"
)

// Delimiters are used to separate parts of node IDs, to guarantee uniqueness
// in particular contexts.
const (
	// ScopeDelim is a general-purpose delimiter used within node IDs to
	// separate different contextual scopes. Different topologies have
	// different key structures.
	ScopeDelim = ";"

	// EdgeDelim separates two node IDs when they need to exist in the same key.
	// Concretely, it separates node IDs in keys that represent edges.
	EdgeDelim = "|"

	// Key added to nodes to prevent them being joined with conntracked connections
	DoesNotMakeConnections = "does_not_make_connections"

	// WeaveOverlayPeerPrefix is the prefix for weave peers in the overlay network
	WeaveOverlayPeerPrefix = ""

	// DockerOverlayPeerPrefix is the prefix for docker peers in the overlay network
	DockerOverlayPeerPrefix = "docker_peer_"
)

// MakeEndpointNodeID produces an endpoint node ID from its composite parts.
func MakeEndpointNodeID(hostID, namespaceID, address, port string) string {
	addressIP := net.ParseIP(address)
	return makeAddressID(hostID, namespaceID, address, addressIP) + ScopeDelim + port
}

// MakeEndpointNodeIDB produces an endpoint node ID from its composite parts in binary, not strings.
func MakeEndpointNodeIDB(hostID string, namespaceID uint32, addressIP net.IP, port uint16) string {
	namespace := ""
	if namespaceID > 0 {
		namespace = strconv.FormatUint(uint64(namespaceID), 10)
	}
	return makeAddressID(hostID, namespace, addressIP.String(), addressIP) + ScopeDelim + strconv.Itoa(int(port))
}

// MakeAddressNodeID produces an address node ID from its composite parts.
func MakeAddressNodeID(hostID, address string) string {
	addressIP := net.ParseIP(address)
	return makeAddressID(hostID, "", address, addressIP)
}

// MakeAddressNodeIDB produces an address node ID from its composite parts, in binary not string.
func MakeAddressNodeIDB(hostID string, addressIP net.IP) string {
	return makeAddressID(hostID, "", addressIP.String(), addressIP)
}

func makeAddressID(hostID, namespaceID, address string, addressIP net.IP) string {
	var scope string

	// Loopback addresses and addresses explicitly marked as local get
	// scoped by hostID
	// Loopback addresses are also scoped by the networking
	// namespace if available, since they can clash.
	if addressIP != nil && LocalNetworks.Contains(addressIP) {
		scope = hostID
	} else if addressIP != nil && addressIP.IsLoopback() {
		scope = hostID
		if namespaceID != "" {
			scope += "-" + namespaceID
		}
	}

	return scope + ScopeDelim + address
}

// MakeProcessNodeID produces a process node ID from its composite parts.
func MakeProcessNodeID(hostID, pid string) string {
	return hostID + ScopeDelim + pid
}

// MakeOverlayNodeID produces an overlay topology node ID from a router peer's
// prefix and name, which is assumed to be globally unique.
func MakeOverlayNodeID(peerPrefix, peerName string) string {
	return "#" + peerPrefix + peerName
}

// ParseOverlayNodeID produces the overlay type and peer name.
func ParseOverlayNodeID(id string) (overlayPrefix string, peerName string) {

	if !strings.HasPrefix(id, "#") {
		// Best we can do
		return "", ""
	}

	id = id[1:]

	if strings.HasPrefix(id, DockerOverlayPeerPrefix) {
		return DockerOverlayPeerPrefix, id[len(DockerOverlayPeerPrefix):]
	}

	return WeaveOverlayPeerPrefix, id
}

// Split a string s into two parts separated by sep.
func split2(s, sep string) (s1, s2 string, ok bool) {
	// Not using strings.SplitN() to avoid a heap allocation
	pos := strings.Index(s, sep)
	if pos == -1 {
		return "", "", false
	}
	return s[:pos], s[pos+1:], true
}

// ParseNodeID produces the id and tag of a single-component node ID.
func ParseNodeID(nodeID string) (id string, tag string, ok bool) {
	return split2(nodeID, ScopeDelim)
}

// ParseEndpointNodeID produces the scope, address, and port and remainder.
// Note that scope may be blank.
func ParseEndpointNodeID(endpointNodeID string) (scope, address, port string, ok bool) {
	// Not using strings.SplitN() to avoid a heap allocation
	first := strings.Index(endpointNodeID, ScopeDelim)
	if first == -1 {
		return "", "", "", false
	}
	second := strings.Index(endpointNodeID[first+1:], ScopeDelim)
	if second == -1 {
		return "", "", "", false
	}
	return endpointNodeID[:first], endpointNodeID[first+1 : first+1+second], endpointNodeID[first+1+second+1:], true
}

// ParseAddressNodeID produces the host ID, address from an address node ID.
func ParseAddressNodeID(addressNodeID string) (hostID, address string, ok bool) {
	return split2(addressNodeID, ScopeDelim)
}

// ParseProcessNodeID produces the host ID and PID from a process node ID.
func ParseProcessNodeID(processNodeID string) (hostID, pid string, ok bool) {
	return split2(processNodeID, ScopeDelim)
}

// IsLoopback ascertains if an address comes from a loopback interface.
func IsLoopback(address string) bool {
	ip := net.ParseIP(address)
	return ip != nil && ip.IsLoopback()
}
