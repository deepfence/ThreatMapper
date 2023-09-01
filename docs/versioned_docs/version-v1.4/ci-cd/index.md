---
title: Scanning in CI
---

# Scanning in CI-CD

You can use ThreatMapper to scan artifacts in a CI (Continuous Integration) pipeline.  If a vulnerability is detected and the CI build is blocked, ThreatMapper will submit the details to the configured notification services.

## Configuring CI Scanning

The ThreatMapper CI action supports several CI pipelines, including CircleCI, GitLab and Jenkins.  It blocks a build if the number of CVE violations exceeds a user-defined threshold, or if the total CVE score exceeds a threshold, and notifications are submitted to the configured management console.

If a build is not blocked, ThreatMapper silently allows it to proceed.

For configuration details, refer to the appropriate [CI/CD Integrations](https://github.com/deepfence/ThreatMapper/tree/master/ci-cd-integrations) in the repo or refer any of the below guides:

```mdx-code-block
import DocCardList from '@theme/DocCardList';
import {useCurrentSidebarCategory} from '@docusaurus/theme-common';

<DocCardList items={useCurrentSidebarCategory().items}/>
```