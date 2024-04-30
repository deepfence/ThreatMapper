---
title: Upgrade from v2.1
---

## Upgrade Neo4j from 4.4 to 5.x

Please choose upgrade steps by console deployment type (docker or kubernetes)

### Prerequisite
1. Download [pre-upgrade-to-v5.sh](https://github.com/deepfence/ThreatMapper/blob/release-2.2/deepfence_neo4j/pre-upgrade-to-v5.sh) script to current directory
2. Make `pre-upgrade-to-v5.sh` executable
    ```
    chmod +x pre-upgrade-to-v5.sh
    ```

### Docker
1. Execute below command before upgrading to new release
    ```
    docker cp pre-upgrade-to-v5.sh deepfence-neo4j:/startup
    docker exec deepfence-neo4j /startup/pre-upgrade-to-v5.sh
    ```
2. Upgrade to new release, wait for scheduler to complete initial neo4j setup, then execute below command
    ```
    docker exec deepfence-neo4j /startup/post-upgrade-to-v5.sh
    ```

### Kubernetes
1. Set variable the below variables
    ```
    export NAMESPACE=deepfence-console
    export PODNAME=`kubectl get pods -n $NAMESPACE --no-headers -o custom-columns=":metadata.name" | grep neo4j`
    ```
2. Execute below command before upgrading to new release
    ```
    kubectl cp -n $NAMESPACE pre-upgrade-to-v5.sh $PODNAME:/startup 
    kubectl exec -it -n $NAMESPACE $PODNAME -- /startup/pre-upgrade-to-v5.sh
    ```
3. Upgrade to new release, wait for scheduler to complete initial neo4j setup, then execute below command
    ```
    kubectl exec -it -n $NAMESPACE $PODNAME -- /startup/post-upgrade-to-v5.sh
    ```