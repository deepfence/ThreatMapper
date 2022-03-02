# Helm chart for Deepfence Console

- Install
  - [Setup Storage](#setup-storage)
  - [Install deepfence-console helm chart](#install-deepfence-console-helm-chart)
- Delete
  - [Delete deepfence-console helm chart](#delete-deepfence-console-helm-chart)
  - [Delete OpenEBS](#delete-openebs)

### Setup Storage
OpenEBS storage is needed only for locally running postgresql and elasticsearch.
When using cloud provided PersistentVolume or cloud managed databases, no need to setup OpenEBS.

#### OpenEBS Local PV provisioner
```bash
# helm v2
helm install --name openebs --namespace openebs --repo "https://openebs.github.io/charts" openebs --set analytics.enabled=false

# helm v3
kubectl create ns openebs
helm install openebs --namespace openebs --repo "https://openebs.github.io/charts" openebs --set analytics.enabled=false
```

- Wait for pods to start up
```bash
kubectl get pods -o wide --namespace openebs -w
```

### Setup metrics server (if not installed)
- Check if metrics server is installed
```bash
kubectl get deployment metrics-server -n kube-system
```
- If not installed, run following command
```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/download/v0.6.1/components.yaml
```

### Install deepfence-console helm chart

**Quick start**

```bash
helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper
```

```bash
# helm v2
helm install deepfence/deepfence-console \
    --name=deepfence-console \
    --set registry.username="<>" \
    --set registry.password="<>"

# helm v3
helm install deepfence-console deepfence/deepfence-console \
    --set registry.username="<>" \
    --set registry.password="<>"
```

**Detailed setup**

```bash
helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper
```

- Create values file
```bash
helm show values deepfence/deepfence-console > deepfence_console_values.yaml
```
- Edit values file and set docker hub username and password
```yaml
registry:
  name: "https://index.docker.io/v1/"
  username: "<>"
  password: "<>"
```
- (Optional) Set image tag
```yaml
image:
  tag: latest
```
- (Optional) Set custom ssl certificate.

Certificates should be in the current directory and have names *.key and *.crt. 
If not set, deepfence provided self signed certificate will be used.
```yaml
# Use custom ssl certificate for Deepfence UI
# Copy *.key and *.crt file to current directory (same directory as values.yaml file)
# Supported file extensions are .crt and .key (.pem, .cert not supported)
tls:
  certFile: "my_server.crt"
  keyFile: "my_server.key"
```
- (Optional) Set storage class

Deepfence uses Local Volume Provisioner by default. It can be changed to any cloud managed Persistent Volumes, value will be `default` in most clouds.
```yaml
volume:
  storageClass: openebs-hostpath
```
- (Optional) Set database

Deepfence uses elasticsearch, postgres, redis, which are deployed in-cluster by default in HA mode.
It can be easily configured to use cloud managed databases like RDS for postgres, AWS elasticsearch service for elasticsearch, AWS elasticashe for redis.
Set the hostnames and ports accordingly.
```yaml
db:
  #  Change following values if using externally managed database
  postgresUserDb:
    host: deepfence-postgres
    port: "5432"
    user: "cve"
    password: "cve"
    dbname: "users"
    sslmode: "disable"
  postgresFetcherDb:
    host: deepfence-postgres
    port: "5432"
    user: "cve"
    password: "cve"
    dbname: "cve"
    sslmode: "disable"
  elasticsearch:
    host: deepfence-es
    port: "9200"
  redis:
    host: deepfence-redis
    port: "6379"
```
- Install deepfence-console helm chart with values file
```bash
# helm v2
helm install -f deepfence_console_values.yaml deepfence/deepfence-console --name=deepfence-console

# helm v3
helm install -f deepfence_console_values.yaml deepfence-console deepfence/deepfence-console
```
- Wait for pods to start up
```bash
kubectl get pods -o wide -w
```
- Get deepfence management console ip
```bash
kubectl get --namespace default svc deepfence-router -w
```

### Delete deepfence-console helm chart
```bash
# helm 2
helm delete --purge deepfence-console

# helm 3
helm delete deepfence-console
```

### Delete OpenEBS
```bash
# Delete all pods, deployments using openebs storage, then delete pvc, pv
kubectl delete pvc --all
kubectl delete pv --all

helm delete openebs --namespace openebs
kubectl delete sc openebs-hostpath openebs-device openebs-jiva-default openebs-snapshot-promoter
kubectl delete ns openebs

kubectl delete crd castemplates.openebs.io
kubectl delete crd cstorpools.openebs.io
kubectl delete crd cstorpoolinstances.openebs.io
kubectl delete crd cstorvolumeclaims.openebs.io
kubectl delete crd cstorvolumereplicas.openebs.io
kubectl delete crd cstorvolumepolicies.openebs.io
kubectl delete crd cstorvolumes.openebs.io
kubectl delete crd runtasks.openebs.io
kubectl delete crd storagepoolclaims.openebs.io
kubectl delete crd storagepools.openebs.io
kubectl delete crd volumesnapshotdatas.volumesnapshot.external-storage.k8s.io
kubectl delete crd volumesnapshots.volumesnapshot.external-storage.k8s.io
kubectl delete crd disks.openebs.io
kubectl delete crd blockdevices.openebs.io
kubectl delete crd blockdeviceclaims.openebs.io
kubectl delete crd cstorbackups.openebs.io
kubectl delete crd cstorrestores.openebs.io
kubectl delete crd cstorcompletedbackups.openebs.io
kubectl delete crd cstorpoolclusters.openebs.io
kubectl delete crd upgradetasks.openebs.io
```
