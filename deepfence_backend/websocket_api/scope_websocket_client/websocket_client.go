package main

import (
	"flag"
	"fmt"
	"os"
	"strings"
)

func main() {
	var nodeType = flag.String("nodeType", "", fmt.Sprintf("Node type to run websocket client for. Ex: %s", strings.Join(AllNodeTypes, ", ")))
	flag.Parse()
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "\n./websocket_client -nodeType host\n\n")
	}
	if !InArray(*nodeType, AllNodeTypes) {
		flag.Usage()
		flag.PrintDefaults()
		os.Exit(1)
	}
	websocketClient := WebsocketClient{}
	websocketClient.Init(*nodeType)
	websocketClient.ConnectToScopeWebSocket()
}
