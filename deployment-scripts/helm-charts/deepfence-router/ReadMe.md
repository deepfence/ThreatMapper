# Helm chart for Deepfence Console - Router Service

- [Install deepfence-router helm chart](#install-deepfence-router-helm-chart)
- [Delete deepfence-router helm chart](#delete-deepfence-router-helm-chart)

### Install deepfence-router helm chart
**Quick start**

```bash
helm install deepfence-router deepfence-router
```

**Detailed setup**

- Create values file
```bash
helm show values deepfence-router > deepfence_router_values.yaml
```
- Set cloud provider
```yaml
# Cloud Provider: aws, azure, gcp, ibm_cloud, open_stack
# cloudProvider is required to set appropriate LoadBalancer annotations
cloudProvider: "aws"
```
- Set management console port (default: 443)
```yaml
# Configure port for browser / agents
managementConsolePort: "443"
```
- Static IP address is recommended in production. Static public ip should be created in the same region/zone/resource group as the cluster.
- AWS:
    - Use `awsEipAllocations` field. Create same number of elastic ip addresses as the number of subnets.
- Azure and Google Cloud:
    - Use `loadBalancerIP` field.
- Self managed kubernetes:
    - Use `externalIPs`. Details [here](https://kubernetes.io/docs/concepts/services-networking/service/#external-ips).
- If ip address is not set, kubernetes (cloud managed) will create an ip address, which will be deleted if helm chart is deleted or if `deepfence-router` service is deleted.

##### LoadBalancer
- By default, LoadBalancer will be `external`
- This can be changed to `internal` if all agents can access management console using internal ip address and user has set up ssh tunneling for port 443 from local desktop.
```yaml
service:
  name: deepfence-router
  type: LoadBalancer
  #  Using static ip address for load balancer
  # - Google Cloud: https://cloud.google.com/kubernetes-engine/docs/tutorials/configuring-domain-name-static-ip
  # loadBalancerIP: "1.2.3.4"
  # - Azure: https://docs.microsoft.com/en-us/azure/aks/static-ip
  # loadBalancerIP: "1.2.3.4"
  loadBalancerIP: ""
  # - AWS: (v1.16+) https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html#kubernetes-1.16
  # Static ip for NLB: awsEipAllocations: "eipalloc-0123456789abcdefg,eipalloc-0123456789hijklmn"
  awsEipAllocations: ""
  # LoadBalancer type: external or internal
  loadBalancerType: "external"
  # If loadBalancerType is "external", we recommend setting loadBalancerSourceRanges to the ip address / CIDR ranges
  # of your laptop's ip or corporate CIDR range. If this is set empty, ports 443 and 80 will be open to the public internet.
  # Example: ["143.231.0.0/16","210.57.79.18/32"]
  loadBalancerSourceRanges: []
  # ACM SSL certificate for AWS Classic LoadBalancer (This cannot be set if awsEipAllocations is set)
  # https://aws.amazon.com/premiumsupport/knowledge-center/terminate-https-traffic-eks-acm/
  # Example: "arn:aws:acm:{region}:{user id}:certificate/{id}"
  awsLoadBalancerAcmArn: ""
  # externalIPs: When kubernetes is not cloud managed, add public ip addresses of kubernetes nodes to externalIPs
  externalIPs: []
  externalTrafficPolicy: "Cluster"
```
- Agent service
```yaml
# User can create separate k8s service for agents if required.
# One use case for this is to deploy external load balancer for browser access and internal load balancer for agent communication.
createSeparateServiceForAgents: "false"
```
### Delete deepfence-router helm chart
Deepfence router load balancer will get deleted. If static ip was not setup, load balancer ip/dns will be deleted.

```bash
# helm 2
helm delete --purge deepfence-router

# helm 3
helm delete deepfence-router
```

### Using Nginx Ingress Controller
If using the Nginx Ingress Controller instead, the service type can be specified as `Ingress`.
```yaml
service:
  name: deepfence-router
  type: Ingress
...
```

Additionally, the Nginx Ingress Controller needs to be installed as specified [here](https://kubernetes.github.io/ingress-nginx/deploy/) based on the cloud provider.

For example, you can use either `helm` or `kubectl` commands for installing on AWS.

Helm Command:
```
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx --create-namespace
```
Kubectl Command:
```
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.2.0/deploy/static/provider/aws/deploy.yaml
```

