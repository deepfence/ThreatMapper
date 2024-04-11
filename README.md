![Deepfence Logo](images/readme/deepfence-logo.png)

[![GitHub license](https://img.shields.io/github/license/deepfence/ThreatMapper)](https://github.com/deepfence/ThreatMapper/blob/master/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/deepfence/ThreatMapper)](https://github.com/deepfence/ThreatMapper/stargazers)
[![Hacktoberfest](https://img.shields.io/github/hacktoberfest/2022/deepfence/ThreatMapper)](https://github.com/deepfence/ThreatMapper/issues)
[![GitHub issues](https://img.shields.io/github/issues/deepfence/ThreatMapper)](https://github.com/deepfence/ThreatMapper/issues)
[![Documentation](https://img.shields.io/badge/documentation-read-green)](https://community.deepfence.io/threatmapper/docs/v2.2/)
[![Demo](https://img.shields.io/badge/threatmapper-demo-green)](https://community.deepfence.io/threatmapper/docs/v2.2/demo)
[![Docker pulls](https://img.shields.io/docker/pulls/deepfenceio/deepfence_agent_ce)](https://hub.docker.com/r/deepfenceio/deepfence_agent_ce)
[![Slack](https://img.shields.io/badge/slack-@deepfence-blue.svg?logo=slack)](https://join.slack.com/t/deepfence-community/shared_invite/zt-podmzle9-5X~qYx8wMaLt9bGWwkSdgQ)
[![Twitter](https://img.shields.io/twitter/url?style=social&url=https%3A%2F%2Fgithub.com%2Fdeepfence%2FThreatMapper)](https://twitter.com/intent/tweet?text=Wow:&url=https%3A%2F%2Fgithub.com%2Fdeepfence%2FThreatMapper)

## :tada: Announcing ThreatMapper v2

_ThreatMapper versions v1.x are depreciated. Please upgrade to the latest version._

<!---  > [ThreatMapper 2.2.0](https://github.com/deepfence/ThreatMapper/releases/tag/v2.2.0) adds ThreatGraph, a rich visualization that uses runtime context such as network flows to prioritize threat scan results.  ThreatGraph enables organizations to narrow down attack path alerts from thousands to a handful of the most meaningful (and threatening). Release 2.2.0 also adds agentless cloud security posture management (CSPM) of cloud assets and agent-based posture management of hosts, evaluating posture against industry-standard compliance benchmarks. --->

# ThreatMapper - Runtime Threat Management and Attack Path Enumeration for Cloud Native

Deepfence ThreatMapper hunts for threats in your production platforms, and ranks these threats based on their risk-of-exploit. It uncovers vulnerable software components, exposed secrets and deviations from good security practice. ThreatMapper uses a combination of agent-based inspection and agent-less monitoring to provide the widest possible coverage to detect threats.

With ThreatMapper's **ThreatGraph** visualization, you can then identify the issues that present the greatest risk to the security of your applications, and prioritize these for planned protection or remediation.

* [Learn more about ThreatMapper](https://community.deepfence.io/threatmapper/docs/v2.2/) in the product documentation.

* [See ThreatMapper running](https://community.deepfence.io/threatmapper/docs/v2.2/demo) in the live demo sandbox.

## When to use ThreatMapper

ThreatMapper carries on the good 'shift left' security practices that you already employ in your development pipelines. It continues to monitor running applications against emerging software vulnerabilities, and monitors the host and cloud configuration against industry-expert benchmarks.

Use ThreatMapper to provide security observability for your production workloads and infrastructure, across cloud, kubernetes, serverless (Fargate) and on-prem platforms.


<!--- # (# Getting Started with ThreatMapper) --->

<!--- # (https://user-images.githubusercontent.com/3711627/183735806-7afc0dd3-a3ee-4486-a241-06541025a3d4.mp4) --->


## Planning your Deployment

ThreatMapper consists of two components:

* The **ThreatMapper Management Console** is a container-based application that can be deployed on a single docker host or in a Kubernetes cluster.
* ThreatMapper monitors running infrastructure using agentless **Cloud Scanner** tasks and agent-based **Sensor Agents**

### The Management Console

You [deploy the Management Console first](https://community.deepfence.io/threatmapper/docs/v2.2/console/), on a suitable docker host or Kubernetes cluster.  For example, on Docker:

```shell script
# Docker installation process for ThreatMapper Management Console

wget https://github.com/deepfence/ThreatMapper/raw/release-2.2/deployment-scripts/docker-compose.yml
docker-compose -f docker-compose.yml up --detach
```

Once the Management Console is up and running, you can [register an admin account and obtain an API key](https://community.deepfence.io/threatmapper/docs/v2.2/console/initial-configuration).

### Cloud Scanner tasks

ThreatMapper [Cloud Scanner tasks](https://community.deepfence.io/threatmapper/docs/v2.2/cloudscanner/) are responsible for querying the cloud provider APIs to gather configuration and identify deviations from compliance benchmarks.

The task is deployed using a Terraform module. The ThreatMapper Management Console will present a basic configuration that may be deployed with Terraform, or you can refer to the expert configurations to fine-tune the deployment ([AWS](https://community.deepfence.io/threatmapper/docs/cloudscanner/aws), [Azure](https://community.deepfence.io/threatmapper/docs/cloudscanner/azure), [GCP](https://community.deepfence.io/threatmapper/docs/cloudscanner/gcp)).

### Sensor Agents

Install the [sensor agents](https://community.deepfence.io/threatmapper/docs/v2.2/sensors/) on your production or development platforms. The sensors report to the Management Console; they tell it what services they discover, provide telemetry and generate manifests of software dependencies.

The following production platforms are supported by ThreatMapper sensor agents:

* [Kubernetes](https://community.deepfence.io/threatmapper/docs/v2.2/sensors/kubernetes/): ThreatMapper sensors are deployed as a daemonset in the Kubernetes cluster, using a helm chart.
* [Docker](https://community.deepfence.io/threatmapper/docs/v2.2/sensors/docker/): ThreatMapper sensors are deployed as a lightweight container.
* [Amazon ECS](https://community.deepfence.io/threatmapper/docs/v2.2/sensors/aws-ecs): ThreatMapper sensors are deployed as a daemon service using a task definition.
* [AWS Fargate](https://community.deepfence.io/threatmapper/docs/v2.2/sensors/aws-fargate): ThreatMapper sensors are deployed as a sidecar container, using a task definition.
* [Bare-Metal or Virtual Machines](https://community.deepfence.io/threatmapper/docs/v2.2/sensors/linux-host/): ThreatMapper sensors are deployed within a lightweight Docker runtime.

For example, run the following command to start the ThreatMapper sensor on a Docker host:

```shell script
docker run -dit \
    --cpus=".2" \
    --name=deepfence-agent \
    --restart on-failure \
    --pid=host \
    --net=host \
    --log-driver json-file \
    --log-opt max-size=50m \
    --privileged=true \
    -v /sys/kernel/debug:/sys/kernel/debug:rw \
    -v /var/log/fenced \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v /:/fenced/mnt/host/:ro \
    -e USER_DEFINED_TAGS="" \
    -e MGMT_CONSOLE_URL="---CONSOLE-IP---" \
    -e MGMT_CONSOLE_PORT="443" \
    -e DEEPFENCE_KEY="---DEEPFENCE-API-KEY---" \
    quay.io/deepfenceio/deepfence_agent_ce:2.2.0
```

Note: Image tag `quay.io/deepfenceio/deepfence_agent_ce:2.2.0-multiarch` is supported in amd64 and arm64/v8 architectures.

On a Kubernetes platform, the sensors are installed using [helm chart](https://community.deepfence.io/threatmapper/docs/v2.2/sensors/kubernetes/)

### Next Steps

Visit the [Deepfence ThreatMapper Documentation](https://community.deepfence.io/threatmapper/docs/v2.2/), to learn how to get started and how to use ThreatMapper.


# Get in touch

Thank you for using ThreatMapper.  Please feel welcome to participate in the [ThreatMapper Community](COMMUNITY.md).

* [Deepfence Community Website](https://community.deepfence.io)
* [<img src="https://img.shields.io/badge/slack-@deepfence-brightgreen.svg?logo=slack">](https://join.slack.com/t/deepfence-community/shared_invite/zt-podmzle9-5X~qYx8wMaLt9bGWwkSdgQ) Got a question, need some help?  Find the Deepfence team on Slack
* [![GitHub issues](https://img.shields.io/github/issues/deepfence/ThreatMapper)](https://github.com/deepfence/ThreatMapper/issues) Got a feature request or found a bug?  Raise an issue
* [![Documentation](https://img.shields.io/badge/documentation-read-green)](https://community.deepfence.io/threatmapper/docs/v2.2/) Read the documentation in the [Deepfence ThreatMapper Documentation](https://community.deepfence.io/threatmapper/docs/v2.2/)
* [productsecurity at deepfence dot io](SECURITY.md): Found a security issue?  Share it in confidence
* Find out more at [deepfence.io](https://deepfence.io/)

# Get ThreatStryker for Enterprise

ThreatStryker is the enterprise version of ThreatMapper, with additional features for enterprise security teams.  ThreatStryker is available as a cloud service or for on-premises deployment.

<a href="https://deepfence.io/view-enterprise-sandbox" target="_blank"><img src="./images/threatstryker.png">

# Security and Support

For any security-related issues in the ThreatMapper project, contact [productsecurity *at* deepfence *dot* io](SECURITY.md).

Please file GitHub issues as needed, and join the Deepfence Community [Slack channel](https://join.slack.com/t/deepfence-community/shared_invite/zt-podmzle9-5X~qYx8wMaLt9bGWwkSdgQ).


# License

The Deepfence ThreatMapper project (this repository) is offered under the [Apache2 license](https://www.apache.org/licenses/LICENSE-2.0).

[Contributions](CONTRIBUTING.md) to Deepfence ThreatMapper project are similarly accepted under the Apache2 license, as per [GitHub's inbound=outbound policy](https://docs.github.com/en/github/site-policy/github-terms-of-service#6-contributions-under-repository-license).

# Performance Stats of deepfence/ThreatMapper - Last 28 days

<a href="https://next.ossinsight.io/widgets/official/compose-last-28-days-stats?repo_id=238662977" target="_blank" style="display: block" align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://next.ossinsight.io/widgets/official/compose-last-28-days-stats/thumbnail.png?repo_id=238662977&image_size=auto&color_scheme=dark" width="662" height="auto">
    <img alt="Performance Stats of deepfence/ThreatMapper - Last 28 days" src="https://next.ossinsight.io/widgets/official/compose-last-28-days-stats/thumbnail.png?repo_id=238662977&image_size=auto&color_scheme=light" width="662" height="auto">
  </picture>
</a>
