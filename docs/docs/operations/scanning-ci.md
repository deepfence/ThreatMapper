---
title: Scanning in CI
---

# Scanning in CI-CD

You can use ThreatMapper to scan artifacts in a CI (Continuous Integration) pipeline.  If a vulnerability is detected and the CI build is blocked, ThreatMapper will submit the details to the configured notification services.

## Configuring CI Scanning

The ThreatMapper CI action supports several CI pipelines, including CircleCI, GitLab and Jenkins.  It blocks a build if the number of CVE violations exceeds a user-defined threshold, or if the total CVE score exceeds a threshold, and notifications are submitted to the configured management console.

If a build is not blocked, ThreatMapper silently allows it to proceed.

For configuration details, refer to the appropriate [CI/CD Integrations](https://github.com/deepfence/ThreatMapper/tree/main/ci-cd-integrations), including:

 * [CircleCI](https://github.com/deepfence/ThreatMapper/tree/main/ci-cd-integrations/circleci)
 * [GitHub Actions](https://github.com/deepfence/ThreatMapper/tree/main/ci-cd-integrations/github-actions)
 * [GitLab](https://github.com/deepfence/ThreatMapper/tree/main/ci-cd-integrations/gitlab)
 * [Jenkins](https://github.com/deepfence/ThreatMapper/tree/main/ci-cd-integrations/jenkins)
