---
title: Installing ThreatMapper Sensors
---

# The Role of ThreatMapper Sensors

Your production workloads are managed using ThreatMapper Sensors.  The ThreatMapper Sensors are implemented as lightweight, privileged containers which monitor activity, discover workloads and retrieve manifests.  They communicate with the ThreatMapper Management Console over TLS, using the URL and API key.

A single ThreatMapper Console can manage multiple workload types, and on-premise and cloud deployments simultaneously.

## Before you Begin

Before you install the Sensors, obtain the Management Console URL and API key as described in the [Initial Configuration](../console/initial-configuration).

You should take care to install the sensor version that matches your Management Console version, as compatibility across versions is not guaranteed.

## Installing the ThreatMapper Sensors

```mdx-code-block
import DocCardList from '@theme/DocCardList';
import {useCurrentSidebarCategory} from '@docusaurus/theme-common';

<DocCardList items={useCurrentSidebarCategory().items}/>
```