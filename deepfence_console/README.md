# Deepfence Console

The console GUI is started from here.

## Environment Setup

### Docker

Go to ```deepfence_console/environment_setup/docker_setup```

**For Ubuntu :** ```setup-docker-golang-ubuntu.sh```

**For Centos :** ```setup-docker-golang-centos.sh```

The above scripts will install Docker, Docker Compose and Go Lang.

### Kubernetes

**Note :** Make sure you have the above Docker setup ready before creating Kubernetes Cluster

Go to ```deepfence_console/environment_setup/kubernetes_setup```

To create **Kubernetes Master Node**, run the following

**For Ubuntu :** ```setup-kubernetes-master-ubuntu.sh```

**For Centos :** ```setup-kubernetes-master-centos.sh```

To create **Kubernetes Slave Node**, run the following

**For Ubuntu :** ```setup-kubernetes-slave-ubuntu.sh```

**For Centos :** ```setup-kubernetes-slave-centos.sh```



## Running GUI

### Docker Setup Only 

#### Clients


Go to ```deepfence_console/docker_gui``` and run the below command

**Production License**
```
docker compose -f docker-compose-prod.yml up -d
```

**Demo License**

```
docker compose -f docker-compose-demo.yml up -d
```

This will download all the required images from the dockerhub and start the containers. 

**Note :** You will require access permisions to download these images. 
Contact <support@deepfence.io> for the same.

You can now open the gui on <https://ip_Address>

#### Developers

Inside deepfence_console repository, clone the following 2 repositories :

deepfence_backend ```git clone https://github.com/deepfence/deepfence_backend.git```

deepfence_ui ```git clone https://github.com/deepfence/deepfence_ui.git```

Make code changes as per the requirements in deepfence_console,deepfence_backend or deepfence_ui repositories

**Note :** If you make changes in deepfence_agent repository, make sure to build it on GUI machine also.

Run ```build.sh``` script inside deepfence_console repository. 

This will create new custom images as per the changes made by the developer.

Go to ```deepfence_console/docker_gui``` and run the below command



**Production License**
```
docker compose -f docker-compose-prod.yml up -d
```

**Demo License**

```
docker compose -f docker-compose-demo.yml up -d
```


### Docker + Kubernetes Setup

#### Clients


Go to ```deepfence_console/kubernetes_gui``` and run the below scripts

**Production License**
```
run-kubectl-prod.sh
```

**Demo License**

```
run-kubectl-demo.sh
```

This will download all the required images from the dockerhub and start the containers. 

**Note :** You will require access permisions to download these images. 
Contact <support@deepfence.io> for the same.

You can now open the gui on <https://ip_Address>

#### Developers

Inside deepfence_console repository, clone the following 2 repositories :

deepfence_backend ```git clone https://github.com/deepfence/deepfence_backend.git```

deepfence_ui ```git clone https://github.com/deepfence/deepfence_ui.git```

Make code changes as per the requirements in deepfence_console,deepfence_backend or deepfence_ui repositories

Run ```build.sh``` script inside ```deepfence_console``` repository. 

This will create new custom images as per the changes made by the developer.

Go to ```deepfence_console/kubernetes_gui``` and run the below script

**Production License**
```
run-kubectl-prod.sh
```

**Demo License**

```
run-kubectl-demo.sh
```

## Pushing Images to Docker Hub

*Only for Developers*

Go to ```deepfence_console``` and run script ```do-docker-push.sh```








