# Helm chart for Deepfence Console

- Install
  - [Setup Storage](#setup-storage)
  - [Install deepfence-console helm chart](#install-deepfence-console-helm-chart)
- Delete
  - [Delete deepfence-console helm chart](#delete-deepfence-console-helm-chart)
  - [Delete OpenEBS](#delete-openebs)

### Setup Storage
OpenEBS storage is needed only for locally running postgresql and elasticsearch.
When using cloud provided PersistentVolume or cloud managed databases, no need to set up OpenEBS.

#### OpenEBS Local PV provisioner
```bash
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
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### Install deepfence-console helm chart

**Quick start**

```bash
helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper
```

```bash
helm install deepfence-console deepfence/deepfence-console \
    --namespace default
```

**Detailed setup**

```bash
helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper
```

- Create values file
```bash
helm show values deepfence/deepfence-console > deepfence_console_values.yaml
```
- (Optional) Edit values file and set docker hub username and password (if using your own registry)
```yaml
registry:
  name: "https://index.docker.io/v1/"
  imagePrefix: ""
  username: ""
  password: ""
```
- Set image tag
```yaml
image:
  tag: 1.5.0
```
- (Optional) Set custom ssl certificate.

Custom certificates can be configured using two options existing secret or directly pass cert and key in helm chart values. Provide one off the two options to configure custom certificates. If not set, deepfence provided self-signed certificate will be used.

  - To pass certificates in values file use below format
  ```yaml
  tls:
    cert: |-
      -----BEGIN CERTIFICATE-----
      MIIFCTCCAvGgAwIBAgIUNshy8GFTjfUR7inZ1JCcN+tDuh4wDQYJKoZIhvcNAQEL
      .....
      JY7f+DC42mQvWWXbll+I60CEtZyExtfBEbSihOR2NoG3WMhXEGAXO5C/jEnSDHKt
      BMepE4d9+TQFcPQ/OKSlP8FB2nPKZJdM+JlXDFWqeKvbdYS4QErRLd33qUmq
      -----END CERTIFICATE-----
    key: |-
      -----BEGIN PRIVATE KEY-----
      MIIJQQIBADANBgkqhkiG9w0BAQEFAASCCSswggknAgEAAoICAQDECeUraonCz/89
      .....
      uK1Rv6SE6KrBFb8JYEpjyjiAlVUGDANqbMtB2dvJ/GD6vTch/kLyZ95x7+V0qXGV
      bHEvWp7ugCTFhurM+lla0d+ElDO2
      -----END PRIVATE KEY-----
  ```

  - If you already have a tls certificate available on cluster in the same namespace as that of the console as tls secret, then pass the name of the secret to helm chart values as shown in below example
  ```yaml
  tls:
    secretName: console-tls-certs
  ```

- (Optional) Set storage class

Deepfence uses Local Volume Provisioner by default. It can be changed to any cloud managed Persistent Volumes, value will be `default` in most clouds.
```yaml
volume:
  storageClass: openebs-hostpath
```
- (Optional) Set database

Deepfence uses elasticsearch, postgres, redis, which are deployed in-cluster by default in HA mode.
It can be easily configured to use cloud managed databases like RDS for postgres, AWS elasticsearch service for elasticsearch.
Set the hostnames and ports accordingly.
```yaml
db:
  #  Change following values accordingly if using externally managed database
  postgresUserDb:
    host: deepfence-postgres
    port: "5432"
    user: "cve"
    password: "cve"
    dbname: "users"
    sslmode: "disable"
  elasticsearch:
    scheme: "http"
    host: deepfence-es
    port: "9200"
    user: ""
    password: ""
  redis:
    host: deepfence-redis
    port: "6379"
```
- Set container runtime socket path
  By default, docker is disabled and containerd is enabled
```yaml
# Mount container runtime socket path to agent pod. Agent will detect which runtime it is using these files.
mountContainerRuntimeSocket:
  dockerSock: false
  # Change if socket path is not the following
  dockerSockPath: "/var/run/docker.sock"
  containerdSock: true
  # Change if socket path is not the following
  containerdSockPath: "/run/containerd/containerd.sock"
  crioSock: false
  # Change if socket path is not the following
  crioSockPath: "/var/run/crio/crio.sock"
```
- Install deepfence-console helm chart with values file
```bash
helm install -f deepfence_console_values.yaml deepfence-console deepfence/deepfence-console --namespace default
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
