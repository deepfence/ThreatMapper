---
title: Microsoft Azure
---

# Configuring Cloud Scanner for Microsoft Azure

Cloud Scanner can be deployed using one of the following:
- [Azure Container Instance](#cloud-scanner-on-azure-container-instance)
- [Azure Kubernetes Cluster](#cloud-scanner-on-aks-cluster)
- [Azure Virtual Machine](#cloud-scanner-on-azure-virtual-machine)

## Cloud Scanner on Azure Container Instance

You need to configure Terraform with the appropriate resources and inputs for your particular scenario, and you will need to provide the IP address or DNS name for the ThreatMapper management console and an API key.

Copy and paste the following into a new file cloud-scanner.tf. Edit the fields: region, mgmt-console-url and deepfence-key.

### Single Subscription

Monitor a single Azure subscription

```terraform
provider "azurerm" {
  features {}
  # Subscription ID to deploy the Azure Container Service
  subscription_id = "<SUBSCRIPTION_ID eg. XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX>"
}

module "cloud-scanner_example_single-subscription" {
  source              = "deepfence/cloud-scanner/azure//examples/single-subscription"
  version             = "0.6.0"
  mgmt-console-url    = "<Console URL> eg. XXX.XXX.XX.XXX"
  mgmt-console-port   = "443"
  deepfence-key       = "<Deepfence-key> eg. XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
  name                = "deepfence-cloud-scanner"
  image               = "quay.io/deepfenceio/cloud_scanner_ce:THREATMAPPER_VERSION"
  # Location name https://gist.github.com/ausfestivus/04e55c7d80229069bf3bc75870630ec8#results
  location            = "eastus"
  # Number of CPU cores (Default: 2 vCPU)
  cpu                 = "2"
  # Memory in GB (Default: 4 GB)
  memory              = "4"
  tags = {
    product = "deepfence-cloud-scanner"
  }
}
```

### Tenant subscriptions

Monitor multiple subscriptions in a Tenant

```terraform
provider "azurerm" {
  features {}
  # Subscription ID to deploy the Azure Container Service
  subscription_id = "<SUBSCRIPTION_ID eg. XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX>"
}

module "cloud-scanner_example_tenant-subscriptions" {
  source                  = "deepfence/cloud-scanner/azure//examples/tenant-subscriptions"
  version                 = "0.6.0"
  mgmt-console-url        = "<Console URL> eg. XXX.XXX.XX.XXX"
  mgmt-console-port       = "<Console port> eg. 443"
  deepfence-key           = "<Deepfence-key> eg. XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
  name                    = "deepfence-cloud-scanner"
  image                   = "quay.io/deepfenceio/cloud_scanner_ce:THREATMAPPER_VERSION"
  # List of subscription ids to monitor
  subscription_ids_access = ["XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX", "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"]
  # Location name https://gist.github.com/ausfestivus/04e55c7d80229069bf3bc75870630ec8#results
  location                = "eastus"
  # Number of CPU cores (Default: 4 vCPU)
  cpu                     = "4"
  # Memory in GB (Default: 8 GB)
  memory                  = "8"
  tags = {
    product = "deepfence-cloud-scanner"
  }
}
```

Ensure that the `name` parameter is set to some unique string to avoid collision with existing resource names in the subscription

Then run
```shell
terraform init
terraform plan
terraform apply
```

For full details, refer to the `examples` provided in the GitHub repository: https://github.com/deepfence/terraform-azure-cloud-scanner

## Cloud Scanner on AKS cluster

:::info

**Pre-requisite:**
1. AKS cluster is created, and you have access to the cluster
2. azure cli is configured and is able to access the required project where cloud scanner will be deployed

:::

Cloud Scanner is deployed as a pod within your AKS cluster

You need to configure Terraform with the appropriate resources and inputs for your particular scenario, and you will need to provide the IP address or DNS name for the ThreatMapper management console and an API key.

Copy and paste the following (single project or multiple projects) into a new file cloud-scanner.tf. Edit the fields: region, mgmt-console-url and deepfence-key.

### Single Subscription Cloud Scanner on AKS Cluster

```terraform
provider "azurerm" {
  subscription_id = "<SUBSCRIPTION_ID eg. XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX>"
  features {}
}

data "azurerm_subscription" "current" {}

data "azurerm_kubernetes_cluster" "default" {
  name                = "< AKS CLUSTER NAME >"
  resource_group_name = "<AKS CLUSTER RESOURCE GROUP>"
}

module "cloud-scanner" {
  source                     = "deepfence/cloud-scanner/azure//examples/aks"
  version                    = "0.7.0"
  name                       = "<name of the app>"
  mgmt-console-url           = "<Console URL> eg. XXX.XXX.XX.XXX"
  deepfence-key              = "<DEEPFENCE API KEY>"
  # ThreatMapper
  cloud_scanner_image        = "quay.io/deepfenceio/cloud_scanner_ce"
  # ThreatStryker
  # cloud_scanner_image      = "quay.io/deepfenceio/cloud_scanner"
  location                   = "< LOCATION >"
  subscription_id            = data.azurerm_subscription.current.subscription_id
  aks_host                   = data.azurerm_kubernetes_cluster.default.kube_config.0.host
  aks_client_key             = base64decode(data.azurerm_kubernetes_cluster.default.kube_config.0.client_key)
  aks_client_certificate     = base64decode(data.azurerm_kubernetes_cluster.default.kube_config.0.client_certificate)
  aks_cluster_ca_certificate = base64decode(data.azurerm_kubernetes_cluster.default.kube_config.0.cluster_ca_certificate)
}
```

### Multiple Subscription Cloud Scanner on AKS cluster

```terraform

provider "azurerm" {
  subscription_id = "<SUBSCRIPTION_ID eg. XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX>"
  features {}
}

data "azurerm_subscription" "current" {}

data "azurerm_kubernetes_cluster" "default" {
  name                = "< AKS CLUSTER NAME >"
  resource_group_name = "<AKS CLUSTER RESOURCE GROUP>"
}

module "test" {
  source                     = "deepfence/cloud-scanner/azure//examples/aks"
  version                    = "0.7.0"
  name                       = "<name of the app>"
  mgmt-console-url           = "<Console URL> eg. XXX.XXX.XX.XXX"
  deepfence-key              = "<DEEPFENCE API KEY>"
  # ThreatMapper
  cloud_scanner_image        = "quay.io/deepfenceio/cloud_scanner_ce"
  # ThreatStryker
  # cloud_scanner_image      = "quay.io/deepfenceio/cloud_scanner"
  location                   = "< LOCATION >"
  subscription_id            = data.azurerm_subscription.current.subscription_id
  aks_host                   = data.azurerm_kubernetes_cluster.default.kube_config.0.host
  aks_client_key             = base64decode(data.azurerm_kubernetes_cluster.default.kube_config.0.client_key)
  aks_client_certificate     = base64decode(data.azurerm_kubernetes_cluster.default.kube_config.0.client_certificate)
  aks_cluster_ca_certificate = base64decode(data.azurerm_kubernetes_cluster.default.kube_config.0.cluster_ca_certificate)
  isOrganizationDeployment   = true
  deployedAccountID          = data.azurerm_subscription.current.subscription_id
  subscription_ids_access    = [ <list of tenants subscription id's> ]
}

```

## Cloud Scanner on Azure virtual machine

:::info

**Pre-requisite:**
1. Install docker and docker compose on the Azure virtual machine ([refer docker documentation for installation instructions](https://docs.docker.com/engine/install/))
2. If an existing Azure virtual machine is used, check if docker and docker compose plugins are installed on the Azure virtual machine.
3. azure cli is configured and is able to access the required project where cloud scanner will be deployed

:::

1. Copy and paste the following (single tenant or multiple tenant) into a new file cloud-scanner.tf. Edit the fields: SUBSCRIPTION_ID and subscription_ids_access if required.

    - Single Subscription Cloud Scanner on Azure virtual machine

      ```terraform
      provider "azurerm" {
        subscription_id = "<SUBSCRIPTION_ID>"
        features {}
      }

      data "azurerm_subscription" "current" {}

      module "infrastructure_cloud-scanner-app" {
        source                  = "deepfence/cloud-scanner/azure//modules/infrastructure/cloud-scanner-app"
        version                 = "0.7.0"
        name                    = "deepfence-cloud-scanner"
        subscription_ids_access = [data.azurerm_subscription.current.subscription_id]
      }

      output "tenant_id" {
        value = module.infrastructure_cloud-scanner-app.tenant_id
      }

      output "client_id" {
        value = module.infrastructure_cloud-scanner-app.client_id
      }

      output "client_secret" {
        value     = module.infrastructure_cloud-scanner-app.client_secret
        sensitive = true
      }
      ```

    - Multiple Subscription Cloud Scanner on Azure virtual machine

      ```terraform
      provider "azurerm" {
        subscription_id = "<SUBSCRIPTION_ID>"
        features {}
      }

      data "azurerm_subscription" "current" {}

      module "infrastructure_cloud-scanner-app" {
        source                  = "deepfence/cloud-scanner/azure//modules/infrastructure/cloud-scanner-app"
        version                 = "0.7.0"
        name                    = "deepfence-cloud-scanner"
        subscription_ids_access = [list of tenant subscriptions ids]
      }

      output "tenant_id" {
        value = module.infrastructure_cloud-scanner-app.tenant_id
      }

      output "client_id" {
        value = module.infrastructure_cloud-scanner-app.client_id
      }

      output "client_secret" {
        value     = module.infrastructure_cloud-scanner-app.client_secret
        sensitive = true
      }
      ```
2. Apply the terraform script and note the output `tenant_id`, `client_id` and `client_secret`.
   Please run this command to retrieve `client_secret` from terraform output.
    ```
    terraform output client_secret
    ```
3. Create a directory **deepfence-cloud-scanner** and download docker-compose.yaml from the url
    ```
    https://raw.githubusercontent.com/deepfence/cloud-scanner/refs/heads/release-2.4/docker-compose.yaml
    ```
    ```bash
    mkdir deepfence-cloud-scanner && cd deepfence-cloud-scanner
    wget https://raw.githubusercontent.com/deepfence/cloud-scanner/refs/heads/release-2.4/docker-compose.yaml
    ```
4. Update the environment vars account details and console details in the docker-compose.yaml, if deploying for multi tenants cloud scanner set `ORGANIZATION_DEPLOYMENT: true`
    ```
    image: quay.io/deepfenceio/cloud_scanner_ce:THREATMAPPER_VERSION
    environment:
      MGMT_CONSOLE_URL: "<CONSOLE_URL>"
      MGMT_CONSOLE_PORT: <CONSOLE_PORT>
      DEEPFENCE_KEY: "<DEEPFENCE_KEY>"
      CLOUD_PROVIDER: "azure"
      CLOUD_REGION: "<LOCATION>"
      CLOUD_ACCOUNT_ID: "<SUBSCRIPTION_ID>"
      DEPLOYED_ACCOUNT_ID: "<SUBSCRIPTION_ID>"
      CLOUD_ACCOUNT_NAME: ""
      ORGANIZATION_DEPLOYMENT: false
      CLOUD_ORGANIZATION_ID: "<TENANT_ID>"
      ROLE_NAME: ""
      CLOUD_AUDIT_LOG_IDS: ""
      HTTP_SERVER_REQUIRED: "false"
      SUCCESS_SIGNAL_URL: ""
      DF_LOG_LEVEL: info
      SCAN_INACTIVE_THRESHOLD: "21600"
      CLOUD_SCANNER_POLICY: ""

      AZURE_TENANT_ID: "<TENANT_ID>"
      AZURE_REGION: "<LOCATION>"
      AZURE_CLIENT_ID: "<CLIENT_ID>"
      AZURE_CLIENT_SECRET: "<CLIENT_SECRET>"
      AZURE_SUBSCRIPTION_ID: "<SUBSCRIPTION_ID>"
    ```
5. Start the cloud scanner using docker compose
    ```
    docker compose up -d
    ```

## What Compliance Scans are Performed?

ThreatMapper builds on a large library of **controls** - these are specific requirements and matching tests.  For example, you will find controls that correspond to best-practice configurations of access to assets, such as enabling TLS access and blocking plain-text HTTP.

Controls are grouped into **benchmarks**. Where multiple benchmarks are available, controls may be used by several benchmarks.

When you run a compliance scan, you can select which benchmarks you wish to measure against, and ThreatMapper will then evaluate the appropriate controls and present the results, by benchmark, once the scan has completed.

For full information, refer to [Operations: Compliance Scanning](/docs/operations/compliance).

:::tip Maximizing Coverage
For maximum coverage, you can use both Cloud Scanner and local Sensor Agent compliance scans together. You could scan your Azure infrastructure using Cloud Scanner, and [scan selected VMs deployed within Azure](other) using the Sensor Agent.
:::