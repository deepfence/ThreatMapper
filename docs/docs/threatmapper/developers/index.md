---
title: ThreatMapper Architecture
---

# ThreatMapper Architecture

:::info

Help needed to  provide architectural information for developers

:::

Resources:
 * [How to build Deepfence ThreatMapper](build)
 * [ThreatMapper Console - README](https://github.com/deepfence/ThreatMapper/blob/master/deepfence_console/README.md)
 * [ThreatMapper WeaveWorks Scope - README](https://github.com/deepfence/ThreatMapper/blob/master/deepfence_ui/README.md)

## Containers built:

```
deepfence_agent_build_ce         
deepfence_agent_ce               
deepfence_api_ce                 
deepfence_diagnosis_ce           
deepfence_discovery_ce           
deepfence_elastic_ce             
deepfence_fetcher_ce             
deepfence_init_ce                
deepfence_postgres_ce            
deepfence_redis_ce               
deepfence_router_ce              
deepfence_ui_ce                  
deepfence_vulnerability_mapper_ce
```

## Containers deployed 

```
deepfence_api_ce
deepfence_diagnosis_ce
deepfence_discovery_ce
deepfence_elastic_ce
deepfence_fetcher_ce
deepfence_init_ce
deepfence_postgres_ce
deepfence_redis_ce
deepfence_router_ce
deepfence_ui_ce
deepfence_vulnerability_mapper_ce (?)
```

## Architecture

```
NAME                  COMMAND                                                                PORTS                                                                                  
deepfence-ui          "/home/deepfence/entrypoint.sh"                                                                                                                               
deepfence-celery      "/app/code/dockerify/celery/entrypoint.sh"                                                                                                                    
deepfence-api         "/app/code/dockerify/api/entrypoint.sh"                                                                                                                       
deepfence-backend     "/app/code/dockerify/backend/entrypoint.sh"                                                                                                                   
deepfence-fetcher     "/usr/bin/start_fetcher.sh"                                            8001-8002/tcp, 8006/tcp                                                                
deepfence-router      "docker-entrypoint.sh haproxy -f /usr/local/etc/haproxy/haproxy.cfg"   0.0.0.0:80->80/tcp, :::80->80/tcp, 0.0.0.0:443->443/tcp, :::443->443/tcp               
deepfence-discovery   "/home/deepfence/entrypoint.sh discovery localhost 8004"                                                                                                      
deepfence-postgres    "docker-entrypoint.sh postgres"                                        5432/tcp                                                                               
deepfence-redis       "/usr/local/bin/startRedis.sh redis-server"                            6379/tcp                                                                               
deepfence-topology    "/home/deepfence/entrypoint.sh topology"                               0.0.0.0:8004->8004/tcp, :::8004->8004/tcp                                              
deepfence-diagnosis   "/home/diagnosis"                                                                                                                                             
deepfence-es-master   "/usr/bin/startEs.sh elasticsearch"                                    0.0.0.0:9200->9200/tcp, :::9200->9200/tcp, 0.0.0.0:9300->9300/tcp, :::9300->9300/tcp    
```
