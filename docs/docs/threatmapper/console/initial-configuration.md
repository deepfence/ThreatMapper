---
title: Initial Configuration
---

# Initial Configuration

Once you have installed the Management Console, you need to register an admin user and obtain the API key needed by the ThreatMapper sensors.  You can also configure the URL for the Management Console, and provide your own TLS certificates.

:::tip
You will need the IP address for the management console:

* On a Docker host, you can find the external, routable IP address of the host using `hostname -I`.
* On a Kubernetes host, find the external IP address of the load balancer for the `deepfence-router` service (`kubectl get --namespace default svc -w deepfence-router`).
:::

## Initial Configuration

1. Open the Console in a browser (https://your-ip-address/):
    
   |![Initial Login](../img/threatmapper-reg-1.png)|
   | :--: |
   | Initial Login |

   You will likely encounter a warning about an invalid SSL/TLS certificate, because the console is using an internally-generated self-signed cert. You can bypass that warning. See below for how to provide your own TLS certificate.

2. Create a new account. Once one user has been registered, additional users are added by invitation from an admin user:

    |![Account Registration](../img/threatmapper-reg-2.png)|
    | :--: |
    | Account Registration |
    
    Account Registration details are private to your Management Console, and are not shared with Deepfence or other third parties.

## Obtain the API Key

The API key is used to authenticate remote sensor agents and cloud scanner tasks. Go to `Settings` -> `User Management` and make note of the API key; you will need it when deploying the Deepfence sensors.

|![API Key](../img/api-key.jpg)|
| :--: |
| View the API key |

For your convenience, the console also displays the specific commands to perform a default installation of the Deepfence Sensor Agents on Docker and Kubernetes hosts, pre-filled with the API key and management console URL data:

|![API Key](../img/agent-setup.jpg)|
| :--: |
| Default Agent Setup (URL and Key masked) |


## Updating Threat Intel Data

Console installations are preconfigured with threat intel data. Once the Console has started, it will update its Threat Intel feed data; this can take several minutes, and is repeated daily.  You can check the status on the Console, at `Settings` -> `Diagnosis`; look for the **System Status** report.

   ![Diagnosis](../img/diagnosis-status.jpg)


## Configuring Access to the Management Console (optional)

By default, the Management Console is accessed by IP address (https://your-ip-address/) and uses a self-signed certificate.

You can configure the URL used to access the Management Console, and you can provide your own TLS certificate:

### Configuring the URL

Go to **Settings** > **Global Settings** and edit the **Deepfence Console URL**.

### Using your own TLS certificates - Docker

On the console machine, place the certificate and private key in `/etc/deepfence/certs` folder. Deepfence looks for the file with `.key` and `.crt` extensions on the specified location on the host:

```bash
# Provide the SSL key and cert, for example, using OpenSSL to create a self-signed pair
sudo openssl req -x509 -newkey rsa:4096 \
  -keyout /etc/deepfence/certs/sslkey.key -out /etc/deepfence/certs/sslcert.crt \
  -days 365 -nodes

# restart the management console to use the new TLS certificate
docker-compose -f docker-compose.yml down
docker-compose -f docker-compose.yml up -d
```

### Using your own TLS certificates - Kubernetes

Follow the instructions to [tune the Helm chart installation](https://github.com/deepfence/ThreatMapper/tree/master/deployment-scripts/helm-charts/deepfence-console#install-deepfence-console-helm-chart), specifically how to configure the `tls: certFile` and `tls:keyFile` values.
