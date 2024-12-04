packer {
  required_plugins {
    docker = {
      version = ">= 0.0.7"
      source  = "github.com/hashicorp/docker"
    }
  }
}

source "docker" "nginx" {
  image  = "debian:latest"
  commit = true
  changes = [
    "ENTRYPOINT nginx -g 'daemon off;'"
  ]
}

build {
  sources = [
    "source.docker.nginx",
  ]

  provisioner "shell" {
    inline = [
      "apt update && apt install -y nginx",
    ]
  }

  post-processor "docker-tag" {
    repository = "${var.image_name}"
    tags       = ["${var.image_tag}"]
  }

  post-processor "shell-local" {
    inline = [
      "docker pull quay.io/deepfenceio/deepfence_package_scanner_cli:2.5.1",
      "docker run -i --rm --net=host --privileged=true -v /var/run/docker.sock:/var/run/docker.sock:rw quay.io/deepfenceio/deepfence_package_scanner_cli:2.5.1 -product=${var.deepfence_product} -license=${var.deepfence_license} -source ${var.image_name}:${var.image_tag} -console-url=${var.DEEPFENCE_CONSOLE_URL} -deepfence-key=${var.DEEPFENCE_KEY} -fail-on-count=${var.FAIL_CVE_COUNT} -fail-on-score=${var.FAIL_CVE_SCORE} -fail-on-critical-count ${var.FAIL_CRITICAL_CVE_COUNT} -scan-type=\"base,java,python,ruby,php,nodejs,js,dotnet\""
    ]
  }
}
