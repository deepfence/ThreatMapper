package kubernetes

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/weaveworks/common/backoff"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	apiv1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/cache"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
	//kubectldescribe "k8s.io/kubernetes/pkg/kubectl/describe"
	//kubectl "k8s.io/kubernetes/pkg/kubectl/describe/versioned"
)

const (
	K8sCniWeaveNet     = "weave-net"
	K8sCniCalico       = "calico-node"
	K8sCniRomana       = "romana-agent"
	K8sCniKubeRouter   = "kube-router"
	K8sCniAmazonVpcCni = "aws-node"
	K8sCniUnknown      = ""
)

// Client keeps track of running kubernetes pods and services
type Client interface {
	Stop()
	WalkNodes(f func(NodeResource) error) error
	WalkPods(f func(Pod) error) error
	WalkServices(f func(Service) error) error
	WalkNamespaces(f func(NamespaceResource) error) error
	WatchPods(f func(Event, Pod))
	DeletePod(namespaceID, podID string) error
	GetCNIPlugin() string
	InitCNIPlugin()
}

type client struct {
	quit           chan struct{}
	client         *kubernetes.Clientset
	podStore       cache.Store
	serviceStore   cache.Store
	nodeStore      cache.Store
	namespaceStore cache.Store
	//calicoAPIClient            *calico_helper.CalicoAPIClient
	cniPlugin       string
	podWatchesMutex sync.Mutex
	podWatches      []func(Event, Pod)
}

// ClientConfig establishes the configuration for the kubernetes client
type ClientConfig struct {
	CertificateAuthority string
	ClientCertificate    string
	ClientKey            string
	Cluster              string
	Context              string
	Insecure             bool
	Kubeconfig           string
	Password             string
	Server               string
	Token                string
	User                 string
	Username             string
}

// NewClient returns a usable Client. Don't forget to Stop it.
func NewClient(config ClientConfig) (Client, error) {
	var restConfig *rest.Config
	if config.Server == "" && config.Kubeconfig == "" {
		// If no API server address or kubeconfig was provided, assume we are running
		// inside a pod. Try to connect to the API server through its
		// Service environment variables, using the default Service
		// Account Token.
		var err error
		if restConfig, err = rest.InClusterConfig(); err != nil {
			return nil, err
		}
	} else {
		var err error
		restConfig, err = clientcmd.NewNonInteractiveDeferredLoadingClientConfig(
			&clientcmd.ClientConfigLoadingRules{ExplicitPath: config.Kubeconfig},
			&clientcmd.ConfigOverrides{
				AuthInfo: clientcmdapi.AuthInfo{
					ClientCertificate: config.ClientCertificate,
					ClientKey:         config.ClientKey,
					Token:             config.Token,
					Username:          config.Username,
					Password:          config.Password,
				},
				ClusterInfo: clientcmdapi.Cluster{
					Server:                config.Server,
					InsecureSkipTLSVerify: config.Insecure,
					CertificateAuthority:  config.CertificateAuthority,
				},
				Context: clientcmdapi.Context{
					Cluster:  config.Cluster,
					AuthInfo: config.User,
				},
				CurrentContext: config.Context,
			},
		).ClientConfig()
		if err != nil {
			return nil, err
		}
	}
	log.Info().Msgf("kubernetes: targeting api server %s", restConfig.Host)

	c, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return nil, err
	}

	result := &client{
		quit:   make(chan struct{}),
		client: c,
	}

	result.podStore = NewEventStore(result.triggerPodWatches, cache.MetaNamespaceKeyFunc)
	result.runReflectorUntil("pods", result.podStore)

	result.serviceStore = result.setupStore("services")
	result.nodeStore = result.setupStore("nodes")
	result.namespaceStore = result.setupStore("namespaces")

	return result, nil
}

func (c *client) InitCNIPlugin() {
	// Check the CNI
	cniPlugin, _ := c.getKubeCNIPlugin()
	c.cniPlugin = cniPlugin
	log.Info().Msgf("CNI: %s", c.cniPlugin)
	if c.cniPlugin == K8sCniCalico {
		//calicoClient, err := calico_helper.NewCalicoAPIClient()
		//if err != nil {
		//	log.Error(err.Error())
		//} else {
		//	c.calicoAPIClient = calicoClient
		//	err = calicoClient.SetupHostEndpoint()
		//	if err != nil {
		//		log.Error(err.Error())
		//	}
		//}
	}
}

//func (c *client) GetCalicoClient() *calico_helper.CalicoAPIClient {
//	return c.calicoAPIClient
//}

func (c *client) GetCNIPlugin() string {
	return c.cniPlugin
}

func (c *client) getKubeCNIPlugin() (string, error) {
	daemonSets, err := c.client.ExtensionsV1beta1().DaemonSets("kube-system").List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return K8sCniUnknown, err
	}
	for _, daemonSet := range daemonSets.Items {
		switch daemonSet.Name {
		case K8sCniWeaveNet:
			return K8sCniWeaveNet, nil
		case K8sCniCalico:
			return K8sCniCalico, nil
		case K8sCniRomana:
			return K8sCniRomana, nil
		case K8sCniAmazonVpcCni:
			return K8sCniAmazonVpcCni, nil
		case K8sCniKubeRouter:
			return K8sCniKubeRouter, nil
		}
	}
	return K8sCniUnknown, nil
}

func (c *client) isResourceSupported(groupVersion schema.GroupVersion, resource string) (bool, error) {
	resourceList, err := c.client.Discovery().ServerResourcesForGroupVersion(groupVersion.String())
	if err != nil {
		if apierrors.IsNotFound(err) {
			return false, nil
		}
		return false, err
	}

	for _, v := range resourceList.APIResources {
		if v.Name == resource {
			return true, nil
		}
	}

	return false, nil
}

func (c *client) setupStore(resource string) cache.Store {
	store := cache.NewStore(cache.MetaNamespaceKeyFunc)
	c.runReflectorUntil(resource, store)
	return store
}

func (c *client) clientAndType(resource string) (rest.Interface, interface{}, error) {
	switch resource {
	case "pods":
		return c.client.CoreV1().RESTClient(), &apiv1.Pod{}, nil
	case "services":
		return c.client.CoreV1().RESTClient(), &apiv1.Service{}, nil
	case "nodes":
		return c.client.CoreV1().RESTClient(), &apiv1.Node{}, nil
	case "namespaces":
		return c.client.CoreV1().RESTClient(), &apiv1.Namespace{}, nil
	}
	return nil, nil, fmt.Errorf("Invalid resource: %v", resource)
}

// runReflectorUntil runs cache.Reflector#ListAndWatch in an endless loop, after checking that the resource is supported by kubernetes.
// Errors are logged and retried with exponential backoff.
func (c *client) runReflectorUntil(resource string, store cache.Store) {
	var r *cache.Reflector
	listAndWatch := func() (bool, error) {
		if r == nil {
			kclient, itemType, err := c.clientAndType(resource)
			if err != nil {
				return false, err
			}
			ok, err := c.isResourceSupported(kclient.APIVersion(), resource)
			if err != nil {
				return false, err
			}
			if !ok {
				log.Info().Msgf("%v are not supported by this Kubernetes version", resource)
				return true, nil
			}
			lw := cache.NewListWatchFromClient(kclient, resource, metav1.NamespaceAll, fields.Everything())
			r = cache.NewReflector(lw, itemType, store, 0)
		}

		select {
		case <-c.quit:
			return true, nil
		default:
			err := r.ListAndWatch(c.quit)
			return false, err
		}
	}
	bo := backoff.New(listAndWatch, fmt.Sprintf("Kubernetes reflector (%s)", resource))
	bo.SetMaxBackoff(5 * time.Minute)
	go bo.Start()
}

func (c *client) WatchPods(f func(Event, Pod)) {
	c.podWatchesMutex.Lock()
	defer c.podWatchesMutex.Unlock()
	c.podWatches = append(c.podWatches, f)
}

func (c *client) triggerPodWatches(e Event, pod interface{}) {
	c.podWatchesMutex.Lock()
	defer c.podWatchesMutex.Unlock()
	for _, watch := range c.podWatches {
		watch(e, NewPod(pod.(*apiv1.Pod)))
	}
}

func (c *client) WalkPods(f func(Pod) error) error {
	for _, m := range c.podStore.List() {
		pod := m.(*apiv1.Pod)
		if err := f(NewPod(pod)); err != nil {
			return err
		}
	}
	return nil
}

func (c *client) WalkNodes(f func(NodeResource) error) error {
	for _, m := range c.nodeStore.List() {
		n := m.(*apiv1.Node)
		if err := f(NewNodeResource(n)); err != nil {
			return err
		}
	}
	return nil
}

func (c *client) WalkServices(f func(Service) error) error {
	for _, m := range c.serviceStore.List() {
		s := m.(*apiv1.Service)
		if err := f(NewService(s)); err != nil {
			return err
		}
	}
	return nil
}

func (c *client) WalkNamespaces(f func(NamespaceResource) error) error {
	for _, m := range c.namespaceStore.List() {
		namespace := m.(*apiv1.Namespace)
		if err := f(NewNamespace(namespace)); err != nil {
			return err
		}
	}
	return nil
}

func (c *client) DeletePod(namespaceID, podID string) error {
	return c.client.CoreV1().Pods(namespaceID).Delete(context.Background(), podID, metav1.DeleteOptions{})
}

func (c *client) Stop() {
	close(c.quit)
}
