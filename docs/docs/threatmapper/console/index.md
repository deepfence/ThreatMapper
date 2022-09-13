---
title: Management Console
---

# The ThreatMapper Management Console

The ThreatMapper Management Console ("Console") is a standalone application, implemented as a fleet of containers.  It should be deployed on either a single docker host, or (for larger deployments) a dedicated Kubernetes cluster. 

## Before You Begin

Review the architecture for the Management Console, as described in [Architecture: Management Console](/threatmapper/architecture/console).

Review the requirements for the Management Console, as described in [System Requirements](/threatmapper/architecture/requirements).


## Installing the Management Console

```mdx-code-block
import DocCardList from '@theme/DocCardList';
import {useCurrentSidebarCategory} from '@docusaurus/theme-common';

<DocCardList items={useCurrentSidebarCategory().items.filter( item => item.label.includes( "Installation" ) )}/>
```

## Post-Installation Tasks

```mdx-code-block
<DocCardList items={useCurrentSidebarCategory().items.filter( item => item.label.includes( "Installation" ) == false )}/>
```
