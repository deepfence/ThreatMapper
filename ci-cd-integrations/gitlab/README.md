# Gitlab CI/CD Demo: Simple Go Server Application.

[This](https://gitlab.com/deepfence-gitlab/simple_go_server) project builds and deploys a "Hello World" Go webapp. It provides an example of how to build and test a Dockerized 
web application on [Gitlab](https://gitlab.com). The image can later be pushed to any remote registry of choice.

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

## References
- https://docs.gitlab.com/ee/ci/docker/using_docker_build.html
- https://docs.gitlab.com/ee/ci/docker/using_docker_images.html

