### Using kubernetes helm charts in this directory
1. create a namespace for example threatmapper
```sh 
kubectl create ns threatmapper
```
2. Install deepfence router helm chart 
```sh 
helm install router ./deepfence-router --namespace threatmapper
```
3. Install deepfence console helm chart 
```sh
helm install console ./deepfence-console --namespace threatmapper
```
4. wait for all the services to start, access to console ui depends on router service type
5. to customize the installation refer values.yaml of deepfence-console and deepfence-router