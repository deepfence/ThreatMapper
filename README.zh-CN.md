![Deepfence Logo](images/readme/deepfence-logo.png)

[![GitHub 协议](https://img.shields.io/github/license/deepfence/ThreatMapper)](https://github.com/deepfence/ThreatMapper/blob/master/LICENSE) [![GitHub 点赞数](https://img.shields.io/github/stars/deepfence/ThreatMapper)](https://github.com/deepfence/ThreatMapper/stargazers) [![Hacktoberfest](https://img.shields.io/github/hacktoberfest/2022/deepfence/ThreatMapper)](https://github.com/deepfence/ThreatMapper/issues) [![GitHub issues](https://img.shields.io/github/issues/deepfence/ThreatMapper)](https://github.com/deepfence/ThreatMapper/issues) [![文档](https://img.shields.io/badge/documentation-read-green)](https://community.deepfence.io/docs/threatmapper) [![Demo](https://img.shields.io/badge/threatmapper-demo-green)](https://community.deepfence.io/docs/threatmapper/demo) [![Docker pulls](https://img.shields.io/docker/pulls/deepfenceio/deepfence_agent_ce)](https://hub.docker.com/r/deepfenceio/deepfence_agent_ce) [![Slack](https://img.shields.io/badge/slack-@deepfence-blue.svg?logo=slack)](https://join.slack.com/t/deepfence-community/shared_invite/zt-podmzle9-5X~qYx8wMaLt9bGWwkSdgQ) [![Twitter](https://img.shields.io/twitter/url?style=social&url=https%3A%2F%2Fgithub.com%2Fdeepfence%2FThreatMapper)](https://twitter.com/intent/tweet?text=Wow:&url=https%3A%2F%2Fgithub.com%2Fdeepfence%2FThreatMapper)

## :tada: ThreatMapper 1.4 发布

> [ThreatMapper 1.4.0](https://github.com/deepfence/ThreatMapper/releases/tag/v1.4.0) 增加了威胁图（ThreatGraph）功能，它的可视化效果丰富，使用运行环境（如网络流）来确定威胁扫描结果的优先级。  ThreatGraph 可以帮助组织，将攻击路径警报数量从数千条缩小到最有意义（和最具威胁性）的几条。 版本 1.4.0 还增加了云资产的无代理云安全状态管理 （CSPM） 和主机基于代理的状态管理，可根据行业标准合规性基准评估状态。

# ThreatMapper - 云原生的运行时威胁管理和攻击路径枚举

Deepfence ThreatMapper 在您的生产平台中搜寻威胁，并根据漏洞利用风险等级，对这些威胁进行排序。 它揭示了易受攻击的软件组件、暴露的密钥和偏离良好安全做法的情况。 ThreatMapper 结合使用基于代理的检查和无代理监视，提供尽可能广泛的覆盖范围来检测威胁。

借助 ThreatMapper 的**威胁图**可视化功能，您可以确定哪些问题对应用程序安全会构成最大风险，然后将这些问题放在计划保护或修复的优先位置上。

<table width="100%">
  <tr>
  <td align="center" valign="top" width="33%"><a href="../../raw/master/images/readme/threatmapper-topology-full.jpg"><img src="images/readme/threatmapper-topology-thumb.jpg" border=0 align="center"/></a>
    <br/><br/>
    了解拓扑
  </td>
  <td align="center" valign="top" width="33%"><a href="../../raw/master/images/readme/threatmapper-vulnerabilities-full.jpg"><img src="images/readme/threatmapper-vulnerabilities-thumb.jpg" border=0 align="center"/></a>
    <br/><br/>
    识别威胁
  </td>
  <td align="center" valign="top" width="33%"><a href="../../raw/master/images/readme/threatmapper-threatgraph-full.jpg"><img src="images/readme/threatmapper-threatgraph-thumb.jpg" border=0 align="center"/></a>
    <br/><br/>
    探索威胁图
  </td>
  </tr>
</table>

 * 在产品文档中[了解更多有关 ThreatMapper](https://community.deepfence.io/docs/threatmapper/) 的信息。

 * [在实时演示沙箱中查看 ThreatMapper](https://community.deepfence.io/docs/threatmapper/demo) 的运行情况。

## 何时使用 ThreatMapper

ThreatMapper 继承了您在开发管道中已采用的良好的“shift left”安全做法。 它继续监控正在运行的应用程序是否存在新出现的软件漏洞，并根据行业专家基准监控主机和云配置。

ThreatMapper 为您的生产工作负载和基础设施，提供跨云、kubernetes、无服务器 （Fargate） 和本地平台的安全观测能力。


# ThreatMapper 入门



https://user-images.githubusercontent.com/3711627/183735806-7afc0dd3-a3ee-4486-a241-06541025a3d4.mp4


## 规划您的部署

ThreatMapper 由两个部分构成：

 * **ThreatMapper 管理控制台**是一个基于容器的应用程序，可以部署在单个 docker 主机上或 Kubernetes 集群中。
 * ThreatMapper 使用无代理**云扫描程器**任务和基于代理的**传感器代理**来监控正在运行的基础架构。

### 管理控制台

首先，您要在合适的 docker 主机或 Kubernetes 集群上，[部署管理控制台](https://community.deepfence.io/docs/threatmapper/console/)。  例如，在 Docker 上：

```shell script
# Docker installation process for ThreatMapper Management Console
sudo sysctl -w vm.max_map_count=262144 # see https://www.elastic.co/guide/en/elasticsearch/reference/current/vm-max-map-count.html

wget https://github.com/deepfence/ThreatMapper/raw/master/deployment-scripts/docker-compose.yml
docker-compose -f docker-compose.yml up --detach
```

管理控制台启动并运行后，您可以[注册管理员账户并获取 API 密钥](https://community.deepfence.io/docs/threatmapper/console/initial-configuration)。

### 云扫描器任务

ThreatMapper [云扫描器任务](https://community.deepfence.io/docs/threatmapper/cloudscanner/)负责查询云提供商 API，以收集配置和识别偏离合规性基准的情况。

该任务是使用 Terraform 模块部署的。 ThreatMapper Manager 控制台将提供可以与Terraforme一起部署的基本配置。 或者您可以参考专家配置来微调部署([AWS](https://github.com/deepfence/terraform-aws-cloud-scanner), [Azure](https://github.com/deepfence/terraform-azure-cloud-scanner), [GCP](https://github.com/deepfence/terraform-gcp-cloud-scanner))。

### 传感器代理

在您的生产或开发平台上安装[传感器代理](https://community.deepfence.io/docs/threatmapper/sensors/)。 传感器向管理控制台报告；告知发现了什么服务，并提供遥测和生成软件依赖项清单。

ThreatMapper 传感器支持以下生产平台：

 * [Kubernetes](https://community.deepfence.io/docs/threatmapper/sensors/kubernetes/): Kubernetes 集群使用 helm 图表将 ThreatMapper 传感器作为守护传感器进行部署。
 * [Docker](https://community.deepfence.io/docs/threatmapper/sensors/docker/): ThreatMapper 传感器作为轻量容器部署。
 * [Amazon ECS](https://community.deepfence.io/docs/threatmapper/sensors/aws-ecs): ThreatMapper 传感器是用任务定义作为守护服务进行部署的。
 * [AWS Fargate](https://community.deepfence.io/docs/threatmapper/sensors/aws-fargate): ThreatMapper 传感器是用任务定义作为 sidecar 容器进行部署的。
 * [裸机或虚拟机](https://community.deepfence.io/docs/threatmapper/sensors/linux-host/)：ThreatMapper 传感器被部署在轻量级 Docker 运行时中。

例如，运行以下命令在 Docker 主机上启动 ThreatMapper 传感器：

```shell script
docker run -dit --cpus=".2" --name=deepfence-agent --restart on-failure --pid=host --net=host --privileged=true \
  -v /sys/kernel/debug:/sys/kernel/debug:rw -v /var/log/fenced -v /var/run/docker.sock:/var/run/docker.sock -v /:/fenced/mnt/host/:ro \
  -e MGMT_CONSOLE_URL="---CONSOLE-IP---" -e MGMT_CONSOLE_PORT="443" -e DEEPFENCE_KEY="---DEEPFENCE-API-KEY---" -e USER_DEFINED_TAGS="" \
  deepfenceio/deepfence_agent_ce:1.4.1
```

在 Kubernetes 平台上，将使用 [helm 图表](https://community.deepfence.io/docs/threatmapper/sensors/kubernetes/) 安装传感器

### 下一步

访问 [Deepfence ThreatMapper 文档](https://community.deepfence.io/docs/threatmapper/)，了解如何开始，以及如何使用 ThreatMapper。


# 联系方式

感谢您使用 ThreatMapper。  欢迎您加入 [ThreatMapper 社区](COMMUNITY.md)。

* [Deepfence 社区网站](https://community.deepfence.io)
* [<img src="https://img.shields.io/badge/slack-@deepfence-brightgreen.svg?logo=slack" />](https://join.slack.com/t/deepfence-community/shared_invite/zt-podmzle9-5X~qYx8wMaLt9bGWwkSdgQ) 有问题，需要帮助？  您可以在 Slack 上找到 Deepfence 团队
* [![GitHub issues](https://img.shields.io/github/issues/deepfence/ThreatMapper)](https://github.com/deepfence/ThreatMapper/issues) 您想获取新功能或发现了问题？  提交一个 issue
* [![文档](https://img.shields.io/badge/documentation-read-green)](https://community.deepfence.io/docs/threatmapper/) 阅读 [Deepfence ThreatMapper 文档](https://community.deepfence.io/docs/threatmapper/)
* [productsecurity@deepfence.io](SECURITY.md)：发现安全问题？  请您私信告知我们
* 了解更多信息，请您访问 [deepfence.io](https://deepfence.io/)


# 安全和支持

对于 ThreatMapper 项目中任何与安全相关的问题，请联系 [productsecurity@deepfence.io](SECURITY.md)

请根据需要提交 GitHub issue，并加入 Deepfence 社区 [Slack 频道](https://join.slack.com/t/deepfence-community/shared_invite/zt-podmzle9-5X~qYx8wMaLt9bGWwkSdgQ)。


# 协议

Deepfence ThreatMapper 项目 (此仓库) 是在 [Apache2 开源协议](https://www.apache.org/licenses/LICENSE-2.0)下提供的。

根据 [GitHub 的 inbound=outbound 政策](https://docs.github.com/en/github/site-policy/github-terms-of-service#6-contributions-under-repository-license)，我们也同样接受在 Apache2 协议下，为Deepfence ThreatMapper 项目做出的[贡献](CONTRIBUTING.md)。
