---
title: Jenkins
---

# Jenkins

Customers build their image, then run the scan on their image. The scan results are sent to Deepfence management console for further analysis.
There is also an option to fail the build in case number of vulnerabilities crosses given limit.

| Variable                            | Description                                                                                                                              |
|-------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|
| def deepfence_mgmt_console_url = '' | Deepfence management console url                                                                                                         |
| def deepfence_key = ""              | API key can be found on settings page of the deepfence                                                                                   |
| def fail_cve_count = 100            | Fail jenkins build if number of vulnerabilities found is >= this number. Set -1 to pass regardless of vulnerabilities.                   |
| def fail_critical_cve_count = 1     | Fail jenkins build if number of critical vulnerabilities found is >= this number. Set -1 to pass regardless of critical vulnerabilities. |
| def fail_high_cve_count = 5         | Fail jenkins build if number of high vulnerabilities found is >= this number. Set -1 to pass regardless of high vulnerabilities.         |
| def fail_medium_cve_count = 10      | Fail jenkins build if number of medium vulnerabilities found is >= this number. Set -1 to pass regardless of medium vulnerabilities.     |
| def fail_low_cve_count = 20         | Fail jenkins build if number of low vulnerabilities found is >= this number. Set -1 to pass regardless of low vulnerabilities.           |  
| def fail_cve_score = 8              | Fail jenkins build if cumulative CVE score is >= this value. Set -1 to pass regardless of cve score.                                     |
| def mask_cve_ids = ""               | Comma separated. Example: "CVE-2019-9168,CVE-2019-9169"                                                                                  |

## Steps
- Ensure `deepfenceio/deepfence_package_scanner_ce:1.5.0` image is present in the VM where Jenkins is installed.
```shell script
docker pull deepfenceio/deepfence_package_scanner_ce:1.5.0
```
### Scripted Pipeline
```
stage('Run Deepfence Vulnerability Scan'){
    DeepfenceAgent = docker.image("deepfenceio/deepfence_package_scanner_ce:1.5.0")
    try {
        c = DeepfenceAgent.run("-it --net=host --privileged=true -v /var/run/docker.sock:/var/run/docker.sock", "-deepfence-key=${deepfence_key} -vulnerability-scan=true -output=table -mode=local -mgmt-console-url=${deepfence_mgmt_console_url} -source=${full_image_name} -fail-on-count=${fail_cve_count} -fail-on-critical-count=${fail_critical_cve_count} -fail-on-high-count=${fail_high_cve_count} -fail-on-medium-count=${fail_medium_cve_count} -fail-on-low-count=${fail_low_cve_count} -fail-on-score=${fail_cve_score} -mask-cve-ids='${mask_cve_ids}' -scan-type='base,java,python,ruby,php,nodejs,js,dotnet'")
        sh "docker logs -f ${c.id}"
        def out = sh script: "docker inspect ${c.id} --format='{{.State.ExitCode}}'", returnStdout: true
        sh "exit ${out}"
    } finally {
        c.stop()
    }
}
```
### Declarative Pipeline
```
stage('Run Deepfence Vulnerability Scan'){
    steps {
        script {
            DeepfenceAgent = docker.image("deepfenceio/deepfence_package_scanner_ce:1.5.0")
            try {
                c = DeepfenceAgent.run("-it --net=host --privileged=true -v /var/run/docker.sock:/var/run/docker.sock", "-deepfence-key=${deepfence_key} -vulnerability-scan=true -output=table -mode=local -mgmt-console-url=${deepfence_mgmt_console_url} -source=${full_image_name} -fail-on-count=${fail_cve_count} -fail-on-critical-count=${fail_critical_cve_count} -fail-on-high-count=${fail_high_cve_count} -fail-on-medium-count=${fail_medium_cve_count} -fail-on-low-count=${fail_low_cve_count} -fail-on-score=${fail_cve_score} -mask-cve-ids='${mask_cve_ids}' -scan-type='base,java,python,ruby,php,nodejs,js,dotnet'")
                sh "docker logs -f ${c.id}"
                def out = sh script: "docker inspect ${c.id} --format='{{.State.ExitCode}}'", returnStdout: true
                sh "exit ${out}"
            } finally {
                c.stop()
            }
        }
    }
}
```
- Set `deepfence_mgmt_console_url`, `fail_cve_count` and any other required variables as per above table in Jenkinsfile.