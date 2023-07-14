node {
    def app
    def full_image_name = 'deepfenceio/jenkins-example:latest'
    def deepfence_mgmt_console_url = '127.0.0.1' // URL address of Deepfence management console Note - Please do not mention port 
    def fail_cve_count = 100 // Fail jenkins build if number of vulnerabilities found is >= this number. Set -1 to pass regardless of vulnerabilities.
    def fail_critical_cve_count = 1 // Fail jenkins build if number of critical vulnerabilities found is >= this number. Set -1 to pass regardless of critical vulnerabilities.
    def fail_high_cve_count = 5 // Fail jenkins build if number of high vulnerabilities found is >= this number. Set -1 to pass regardless of high vulnerabilities.
    def fail_medium_cve_count = 10 // Fail jenkins build if number of medium vulnerabilities found is >= this number. Set -1 to pass regardless of medium vulnerabilities.
    def fail_low_cve_count = 20 // Fail jenkins build if number of low vulnerabilities found is >= this number. Set -1 to pass regardless of low vulnerabilities.            
    def fail_cve_score = 8 // Fail jenkins build if cumulative CVE score is >= this value. Set -1 to pass regardless of cve score.
    def mask_cve_ids = "" // Comma separated. Example: "CVE-2019-9168,CVE-2019-9169"
    def deepfence_key = "" // API key can be found on settings page of the deepfence 

    stage('Clone repository') {
        checkout scm
    }

    stage('Build image') {
        app = docker.build("${full_image_name}", "-f ci-cd-integrations/jenkins/Dockerfile .")
    }

    stage('Run Deepfence Vulnerability Mapper'){
        DeepfenceAgent = docker.image("deepfenceio/deepfence_package_scanner_ce:v2")
        try {
            c = DeepfenceAgent.run("-it --net=host --privileged -v /var/run/docker.sock:/var/run/docker.sock:rw", "-deepfence-key=${deepfence_key} -console-url=${deepfence_mgmt_console_url} -source=${full_image_name} -fail-on-count=${fail_cve_count} -fail-on-critical-count=${fail_critical_cve_count} -fail-on-high-count=${fail_high_cve_count} -fail-on-medium-count=${fail_medium_cve_count} -fail-on-low-count=${fail_low_cve_count} -fail-on-score=${fail_cve_score} -mask-cve-ids='${mask_cve_ids}'")
            sh "docker logs -f ${c.id}"
            def out = sh script: "docker inspect ${c.id} --format='{{.State.ExitCode}}'", returnStdout: true
            sh "exit ${out}"
        } finally {
            c.stop()
        }
    }

}