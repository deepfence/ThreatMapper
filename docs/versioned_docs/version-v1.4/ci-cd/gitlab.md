---
title: Gitlab
---

# Gitlab

This is an example of how to build and test a Dockerized web application on [Gitlab](https://gitlab.com). The image can later be pushed to any remote registry of choice.

### Configure environment variables on Gitlab
The following [environment variables](https://docs.gitlab.com/ee/ci/variables/) must be set for the project on Gitlab
via the project settings (i.e `Project > Settings > CI/CD > Variables`) page, before the project can be built successfully.


| Variable                  | Description                                                                                                                      |
|---------------------------|----------------------------------------------------------------------------------------------------------------------------------|
| `DEEPFENCE_CONSOLE_URL`   | Deepfence management console url                                                                                                 |
| `FAIL_CVE_COUNT`          | Fail the build if number of vulnerabilities found >= this value. Set -1 to pass regardless of vulnerabilities.                   |
| `FAIL_CRITICAL_CVE_COUNT` | Fail the build if number of critical vulnerabilities found >= this value. Set -1 to pass regardless of critical vulnerabilities. |
| `FAIL_HIGH_CVE_COUNT`     | Fail the build if number of high vulnerabilities found >= this value. Set -1 to pass regardless of high vulnerabilities.         |
| `FAIL_MEDIUM_CVE_COUNT`   | Fail the build if number of medium vulnerabilities found >= this value. Set -1 to pass regardless of medium vulnerabilities.     |
| `FAIL_LOW_CVE_COUNT`      | Fail the build if number of low vulnerabilities found >= this value. Set -1 to pass regardless of low vulnerabilities.           |
| `FAIL_CVE_SCORE`          | Fail the build if cumulative CVE score is >= this value. Set -1 to pass regardless of cve score.                                 |

## Sample Gitlab CI YAML

```
stages:
  - test-docker-build
 
test-docker-build:
  image: docker:latest
  stage: test-docker-build
  services: 
    - docker:dind
  variables:
    IMAGE_NAME: go-server-test:latest
    DEEPFENCE_KEY: ""
    DEEPFENCE_CONSOLE_URL: 127.0.0.1
    FAIL_CVE_COUNT: 100
    FAIL_CRITICAL_CVE_COUNT: 1000
    FAIL_HIGH_CVE_COUNT: 10
    FAIL_MEDIUM_CVE_COUNT: 1000
    FAIL_LOW_CVE_COUNT: 1000
    FAIL_CVE_SCORE: -1
  script:
    - docker build -t $IMAGE_NAME .
    - docker pull deepfenceio/deepfence_package_scanner_ce:1.4.3
    - docker run -i --rm --net=host --privileged=true -v /var/run/docker.sock:/var/run/docker.sock:rw deepfenceio/deepfence_package_scanner_ce:1.4.3 -source"$IMAGE_NAME" -console-url=$DEEPFENCE_CONSOLE_URL -deepfence-key=$DEEPFENCE_KEY -fail-on-count=$FAIL_CVE_COUNT -fail-on-critical-count=$FAIL_CRITICAL_CVE_COUNT -fail-on-high-count=$FAIL_HIGH_CVE_COUNT -fail-on-medium-count=$FAIL_MEDIUM_CVE_COUNT -fail-on-low-count=$FAIL_LOW_CVE_COUNT -fail-on-score=$FAIL_CVE_SCORE -scan-type="base,java,python,ruby,php,nodejs,js,dotnet"
```

## References
- https://docs.gitlab.com/ee/ci/docker/using_docker_build.html
- https://docs.gitlab.com/ee/ci/docker/using_docker_images.html