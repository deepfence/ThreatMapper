package main

import (
	"context"
	"errors"

	coreV1 "k8s.io/api/core/v1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func getPods(options metaV1.ListOptions) ([]coreV1.Pod, error) {
	ctx := context.Background()
	pods, err := kubeCli.CoreV1().Pods(consoleNamespace).List(ctx, options)
	if err != nil {
		return nil, err
	}
	return pods.Items, nil
}

func getClusterNodes(options metaV1.ListOptions) ([]coreV1.Node, error) {
	ctx := context.Background()
	nodes, err := kubeCli.CoreV1().Nodes().List(ctx, options)
	if err != nil {
		return nil, err
	}
	return nodes.Items, nil
}

func getPodWithLabel(label string, pods []coreV1.Pod) (coreV1.Pod, error) {
	for _, pod := range pods {
		labels := pod.Labels
		if labels["name"] == label {
			return pod, nil
		}
	}
	return coreV1.Pod{}, errors.New("cannot find pod")
}
