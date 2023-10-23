---
title: Sensor Agent does not start
---

# Sensor Agent does not start


## When using Minikube (possibly other platforms), the deepfence-agent does not start

Running `kubectl get pods -n deepfence` gives output similar to:

```
NAME                                      READY   STATUS              RESTARTS   AGE
deepfence-agent-8lxng                     0/1     ContainerCreating   0          3m14s
deepfence-cluster-agent-d86cd4df8-c4fz2   1/1     Running             0          3m14s
```

Running `kubectl describe pod -n deepfence deepfence-agent-8lxng` reveals:

```
  Warning  FailedMount  30s (x8 over 3m14s)  kubelet            MountVolume.SetUp failed for volume "containerd-sock" : hostPath type check failed: /run/containerd/containerd.sock is not a socket file
```

**Solution:** edit `deepfence_agent_values.yaml` and set `containerdSock` to be `"false"`.  Redeploy the agent using:

```bash
helm delete deepfence-agent -n deepfence

helm show values deepfence/deepfence-agent --version 2.0.2 > deepfence_agent_values.yaml

# You will need to update the following values:
#   containerdSock - set to "false"
vim deepfence_agent_values.yaml

helm install -f deepfence_agent_values.yaml deepfence-agent deepfence/deepfence-agent \
    --namespace deepfence \
    --create-namespace \
    --version 2.0.2
```
