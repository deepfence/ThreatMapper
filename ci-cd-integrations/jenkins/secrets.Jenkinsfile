node {
    def app
    def full_image_name = 'deepfenceio/jenkins-example:latest'
    def deepfence_mgmt_console_url = '127.0.0.1' // URL address of Deepfence management console Note - Please do not mention port 
    def fail_secret_count = 10 // Fail jenkins build if number of vulnerabilities found is >= this number. Set -1 to pass regardless of vulnerabilities.
    def fail_high_secret_count = 5 // Fail jenkins build if number of high vulnerabilities found is >= this number. Set -1 to pass regardless of high vulnerabilities.
    def fail_medium_secret_count = 10 // Fail jenkins build if number of medium vulnerabilities found is >= this number. Set -1 to pass regardless of medium vulnerabilities.
    def fail_low_secret_count = 20 // Fail jenkins build if number of low vulnerabilities found is >= this number. Set -1 to pass regardless of low vulnerabilities.            
    def deepfence_key = "" // API key can be found on settings page of the deepfence 

    stage('Clone repository') {
        checkout scm
    }

    stage('Build image') {
        app = docker.build("${full_image_name}", "-f ci-cd-integrations/jenkins/Dockerfile .")
    }

    stage('Run Deepfence Secret Scanner'){
        DeepfenceAgent = docker.image("deepfenceio/deepfence_secret_scanner_ce:v2")
        try {
            c = DeepfenceAgent.run("-it --net=host -v /var/run/docker.sock:/var/run/docker.sock:rw", "-image-name $full_image_name -fail-on-count=${fail_secret_count} -fail-on-high-count=${fail_high_secret_count} -fail-on-medium-count=${fail_medium_secret_count} -fail-on-low-count=${fail_low_secret_count}")
            sh "docker logs -f ${c.id}"
            def out = sh script: "docker inspect ${c.id} --format='{{.State.ExitCode}}'", returnStdout: true
            sh "exit ${out}"
        } finally {
            c.stop()
        }
    }

}