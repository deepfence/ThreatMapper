package kubernetes

import (
	"context"
	"fmt"
	//calico_helper "github.com/weaveworks/scope/calico-helper"
	"io"
	"sync"
	"time"

	"github.com/weaveworks/common/backoff"

	log "github.com/sirupsen/logrus"
	apiappsv1 "k8s.io/api/apps/v1"
	apibatchv1 "k8s.io/api/batch/v1"
	apiv1 "k8s.io/api/core/v1"
	storagev1 "k8s.io/api/storage/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
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
	WalkDeployments(f func(Deployment) error) error
	WalkDaemonSets(f func(DaemonSet) error) error
	WalkStatefulSets(f func(StatefulSet) error) error
	WalkCronJobs(f func(CronJob) error) error
	WalkNamespaces(f func(NamespaceResource) error) error
	WalkPersistentVolumes(f func(PersistentVolume) error) error
	WalkPersistentVolumeClaims(f func(PersistentVolumeClaim) error) error
	WalkStorageClasses(f func(StorageClass) error) error
	WalkJobs(f func(Job) error) error
	WatchPods(f func(Event, Pod))

	GetLogs(namespaceID, podID string, containerNames []string) (io.ReadCloser, error)
	//Describe(namespaceID, resourceID string, groupKind schema.GroupKind, restMapping apimeta.RESTMapping) (io.ReadCloser, error)
	DeletePod(namespaceID, podID string) error
	//ScaleUp(namespaceID, id string) error
	//ScaleDown(namespaceID, id string) error
	GetCNIPlugin() string
	//GetCalicoClient() *calico_helper.CalicoAPIClient
	InitCNIPlugin()
}

//// ResourceMap is the mapping of resource and their GroupKind
//var ResourceMap = map[string]schema.GroupKind{
//	"Pod":                   {Group: apiv1.GroupName, Kind: "Pod"},
//	"Service":               {Group: apiv1.GroupName, Kind: "Service"},
//	"Deployment":            {Group: apiappsv1.GroupName, Kind: "Deployment"},
//	"DaemonSet":             {Group: apiappsv1.GroupName, Kind: "DaemonSet"},
//	"StatefulSet":           {Group: apiappsv1.GroupName, Kind: "StatefulSet"},
//	"Job":                   {Group: apibatchv1.GroupName, Kind: "Job"},
//	"CronJob":               {Group: apibatchv1.GroupName, Kind: "CronJob"},
//	"Node":                  {Group: apiv1.GroupName, Kind: "Node"},
//	"PersistentVolume":      {Group: apiv1.GroupName, Kind: "PersistentVolume"},
//	"PersistentVolumeClaim": {Group: apiv1.GroupName, Kind: "PersistentVolumeClaim"},
//	"StorageClass":          {Group: storagev1.GroupName, Kind: "StorageClass"},
//}

type client struct {
	quit                       chan struct{}
	client                     *kubernetes.Clientset
	podStore                   cache.Store
	serviceStore               cache.Store
	deploymentStore            cache.Store
	daemonSetStore             cache.Store
	statefulSetStore           cache.Store
	jobStore                   cache.Store
	cronJobStore               cache.Store
	nodeStore                  cache.Store
	namespaceStore             cache.Store
	persistentVolumeStore      cache.Store
	persistentVolumeClaimStore cache.Store
	storageClassStore          cache.Store
	//calicoAPIClient            *calico_helper.CalicoAPIClient
	cniPlugin string

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
	log.Infof("kubernetes: targeting api server %s", restConfig.Host)

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
	result.deploymentStore = result.setupStore("deployments")
	result.daemonSetStore = result.setupStore("daemonsets")
	result.jobStore = result.setupStore("jobs")
	result.statefulSetStore = result.setupStore("statefulsets")
	result.cronJobStore = result.setupStore("cronjobs")
	//result.persistentVolumeStore = result.setupStore("persistentvolumes")
	//result.persistentVolumeClaimStore = result.setupStore("persistentvolumeclaims")
	//result.storageClassStore = result.setupStore("storageclasses")
	//result.volumeSnapshotStore = result.setupStore("volumesnapshots")
	//result.volumeSnapshotDataStore = result.setupStore("volumesnapshotdatas")

	return result, nil
}

func (c *client) InitCNIPlugin() {
	// Check the CNI
	cniPlugin, err := c.getKubeCNIPlugin()
	if err != nil {
		log.Errorf("CNI error: %v", err.Error())
		return
	}
	c.cniPlugin = cniPlugin
	log.Info("CNI: ", c.cniPlugin)
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
	daemonSets, err := c.client.AppsV1().DaemonSets("kube-system").List(context.Background(), metav1.ListOptions{})
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
	case "persistentvolumes":
		return c.client.CoreV1().RESTClient(), &apiv1.PersistentVolume{}, nil
	case "persistentvolumeclaims":
		return c.client.CoreV1().RESTClient(), &apiv1.PersistentVolumeClaim{}, nil
	case "storageclasses":
		return c.client.StorageV1().RESTClient(), &storagev1.StorageClass{}, nil
	case "deployments":
		return c.client.AppsV1().RESTClient(), &apiappsv1.Deployment{}, nil
	case "daemonsets":
		return c.client.AppsV1().RESTClient(), &apiappsv1.DaemonSet{}, nil
	case "jobs":
		return c.client.BatchV1().RESTClient(), &apibatchv1.Job{}, nil
	case "statefulsets":
		return c.client.AppsV1().RESTClient(), &apiappsv1.StatefulSet{}, nil
	case "cronjobs":
		return c.client.BatchV1().RESTClient(), &apibatchv1.CronJob{}, nil
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
				log.Infof("%v are not supported by this Kubernetes version", resource)
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

func (c *client) WalkPersistentVolumes(f func(PersistentVolume) error) error {
	for _, m := range c.persistentVolumeStore.List() {
		pv := m.(*apiv1.PersistentVolume)
		if err := f(NewPersistentVolume(pv)); err != nil {
			return err
		}
	}
	return nil
}

func (c *client) WalkPersistentVolumeClaims(f func(PersistentVolumeClaim) error) error {
	for _, m := range c.persistentVolumeClaimStore.List() {
		pvc := m.(*apiv1.PersistentVolumeClaim)
		if err := f(NewPersistentVolumeClaim(pvc)); err != nil {
			return err
		}
	}
	return nil
}

func (c *client) WalkStorageClasses(f func(StorageClass) error) error {
	for _, m := range c.storageClassStore.List() {
		sc := m.(*storagev1.StorageClass)
		if err := f(NewStorageClass(sc)); err != nil {
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

func (c *client) WalkDeployments(f func(Deployment) error) error {
	if c.deploymentStore == nil {
		return nil
	}
	for _, m := range c.deploymentStore.List() {
		d := m.(*apiappsv1.Deployment)
		if err := f(NewDeployment(d)); err != nil {
			return err
		}
	}
	return nil
}

// WalkDaemonSets calls f for each daemonset
func (c *client) WalkDaemonSets(f func(DaemonSet) error) error {
	if c.daemonSetStore == nil {
		return nil
	}
	for _, m := range c.daemonSetStore.List() {
		ds := m.(*apiappsv1.DaemonSet)
		if err := f(NewDaemonSet(ds)); err != nil {
			return err
		}
	}
	return nil
}

// WalkStatefulSets calls f for each statefulset
func (c *client) WalkStatefulSets(f func(StatefulSet) error) error {
	if c.statefulSetStore == nil {
		return nil
	}
	for _, m := range c.statefulSetStore.List() {
		s := m.(*apiappsv1.StatefulSet)
		if err := f(NewStatefulSet(s)); err != nil {
			return err
		}
	}
	return nil
}

// WalkCronJobs calls f for each cronjob
func (c *client) WalkCronJobs(f func(CronJob) error) error {
	if c.cronJobStore == nil {
		return nil
	}
	// We index jobs by id to make lookup for each cronjob more efficient
	jobs := map[types.UID]*apibatchv1.Job{}
	for _, m := range c.jobStore.List() {
		j := m.(*apibatchv1.Job)
		jobs[j.UID] = j
	}
	for _, m := range c.cronJobStore.List() {
		cj := m.(*apibatchv1.CronJob)
		if err := f(NewCronJob(cj, jobs)); err != nil {
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

func (c *client) WalkJobs(f func(Job) error) error {
	for _, m := range c.jobStore.List() {
		job := m.(*apibatchv1.Job)
		if err := f(NewJob(job)); err != nil {
			return err
		}
	}
	return nil
}

func (c *client) GetLogs(namespaceID, podID string, containerNames []string) (io.ReadCloser, error) {
	readClosersWithLabel := map[io.ReadCloser]string{}
	ctx := context.Background()
	for _, container := range containerNames {
		req := c.client.CoreV1().Pods(namespaceID).GetLogs(
			podID,
			&apiv1.PodLogOptions{
				Follow:     true,
				Timestamps: true,
				Container:  container,
			},
		)
		readCloser, err := req.Stream(ctx)
		if err != nil {
			for rc := range readClosersWithLabel {
				rc.Close()
			}
			return nil, err
		}
		readClosersWithLabel[readCloser] = container
	}

	return NewLogReadCloser(readClosersWithLabel), nil
}

//func (c *client) Describe(namespaceID, resourceID string, groupKind schema.GroupKind, restMapping apimeta.RESTMapping) (io.ReadCloser, error) {
//	readClosersWithLabel := map[io.ReadCloser]string{}
//	restConfig, err := rest.InClusterConfig()
//	if err != nil {
//		return nil, err
//	}
//	describer, ok := kubectl.DescriberFor(groupKind, restConfig)
//	if !ok {
//		describer, ok = kubectl.GenericDescriberFor(&restMapping, restConfig)
//		if !ok {
//			return nil, errors.New("Resource not found")
//		}
//	}
//	describerSetting := kubectldescribe.DescriberSettings{
//		ShowEvents: true,
//	}
//	obj, err := describer.Describe(namespaceID, resourceID, describerSetting)
//	if err != nil {
//		return nil, err
//	}
//	formattedObj := ioutil.NopCloser(bytes.NewReader([]byte(obj)))
//	readClosersWithLabel[formattedObj] = "describe"
//
//	return NewLogReadCloser(readClosersWithLabel), nil
//}

func (c *client) DeletePod(namespaceID, podID string) error {
	return c.client.CoreV1().Pods(namespaceID).Delete(context.Background(), podID, metav1.DeleteOptions{})
}

//func (c *client) ScaleUp(namespaceID, id string) error {
//	return c.modifyScale(namespaceID, id, func(scale *autoscalingv1.Scale) {
//		scale.Spec.Replicas++
//	})
//}
//
//func (c *client) ScaleDown(namespaceID, id string) error {
//	return c.modifyScale(namespaceID, id, func(scale *autoscalingv1.Scale) {
//		scale.Spec.Replicas--
//	})
//}

//func (c *client) modifyScale(namespaceID, id string, f func(*autoscalingv1.Scale)) error {
//	scaler := c.client.AppsV1().Deployments(namespaceID)
//	scale, err := scaler.GetScale(id, metav1.GetOptions{})
//	if err != nil {
//		return err
//	}
//	f(scale)
//	_, err = scaler.UpdateScale(id, scale)
//	return err
//}

func (c *client) Stop() {
	close(c.quit)
}
