---
title: Preparing for Compliance Posture Scanning
---

# Preparing for Compliance Posture Scanning

Cloud Compliance posture scanning uses a Compliance Scanner task which is installed in your monitored cloud instances.  

The Cloud Scanner task interacts with the local cloud APIs under the instruction of the remote management console. This architecture removes the need to open up cloud APIs to remote (over the internet) clients, where security is harder to achieve.

## Before You Begin

Review the architecture for compliance scanning, as described in [Architecture: Cloud Scanner task](../architecture/cloudscanner).


## Configuring Cloud Posture Management

```mdx-code-block
import DocCardList from '@theme/DocCardList';
import {useCurrentSidebarCategory} from '@docusaurus/theme-common';

<DocCardList items={useCurrentSidebarCategory().items}/>
```