# Jenkins example for Deepfence Vulnerability Mapper

This project demonstrates using Deepfence Vulnerability Mapper in Jenkins build pipeline.
After customer's image is built, Deepfence Vulnerability Mapper is run on the image and results are sent to Deepfence management console for further analysis.
There is also an option to fail the build in case number of vulnerabilities crosses given limit.

| Variable                           | Description                                               |
| ---------------------------------- | --------------------------------------------------------- |
| def deepfence_mgmt_console_ip = '' | Deepfence management console ip address                   |
| def fail_cve_count = 100           | Fail jenkins build if number of vulnerabilities found >= this value. Set -1 to pass regardless of vulnerabilities.  |
| def fail_cve_score = 140           | Fail jenkins build if cumulative CVE score is >= this value. Set -1 to pass regardless of cve score.  | 

## Steps
- Ensure `deepfenceio/deepfence_vulnerability_mapper_ce` image is present in the vm where jenkins is installed.
```shell script
docker pull deepfenceio/deepfence_vulnerability_mapper_ce
```
- Add following jenkins stage to your Jenkinsfile
```
stage('Run Deepfence Vulnerability Mapper'){
    DeepfenceAgent = docker.image("deepfenceio/deepfence_vulnerability_mapper_ce:latest")
    try {
        c = DeepfenceAgent.run("-it --net=host -v /var/run/docker.sock:/var/run/docker.sock", "-mgmt-console-ip=${deepfence_mgmt_console_ip} -image-name=${full_image_name} -fail-cve-count=${fail_cve_count} -fail-cve-score=${fail_cve_score}")
        sh "docker logs -f ${c.id}"
        def out = sh script: "docker inspect ${c.id} --format='{{.State.ExitCode}}'", returnStdout: true
        sh "exit ${out}"
    } finally {
        c.stop()
    }
}
```
- Set `deepfence_mgmt_console_ip`, `fail_cve_count` variables in Jenkinsfile
