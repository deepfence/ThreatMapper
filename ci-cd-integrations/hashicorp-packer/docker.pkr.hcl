packer {
  required_plugins {
    docker = {
      version = ">= 0.0.7"
      source  = "github.com/hashicorp/docker"
    }
  }
}

source "docker" "debian" {
  image   = "debian:bullseye"
  commit  = true
  changes = [
    "ENTRYPOINT nginx -g 'daemon off;'"
  ]
}

build {
  sources = [
    "source.docker.debian",
  ]

  provisioner "shell" {
    inline = [
      "apt-get update",
      "apt-get install -y nginx"
    ]
  }

  post-processor "docker-tag" {
    repository = "${var.image_name}"
    tag        = ["${var.image_tag}"]
  }

  variable "DEEPFENCE_DOCKER_USERNAME" {
  type      = string
  default   = "mukulietlucknow"
  sensitive = true
}

variable "DEEPFENCE_DOCKER_PASSWORD" {
  type      = string
  default   = "a501881f-ff58-4179-acde-05a453d7b756"
  sensitive = true
}

variable "DEEPFENCE_CONSOLE_IP" {
  type      = string
  default   = "137.184.52.247"
  sensitive = false
}

variable "DEEPFENCE_KEY" {
  type      = string
  default   = "3da75d80-eb42-4918-914b-2b811cf26e43"
  sensitive = true
}

variable "FAIL_CVE_COUNT" {
  type      = string
  default   = "100"
  sensitive = false
}

variable "FAIL_CVE_SCORE" {
  type      = string
  default   = "8"
  sensitive = false
}

variable "image_name" {
  type      = string
  default   = "deepfenceio/deepfence_vulnerability_mapper_ce"
  sensitive = false
}

variable "image_tag" {
  type      = string
  default   = "latest"
  sensitive = false
}

  post-processor "shell-local" {
    inline = [
      "rm -rf deepfence_docker && mkdir deepfence_docker",
      "docker_config_path=\"$(pwd)/deepfence_docker\"",
      "docker_creds=$(echo -n \"${var.DEEPFENCE_DOCKER_USERNAME}:${var.DEEPFENCE_DOCKER_PASSWORD}\" | base64)",
      "echo \"{\\\"auths\\\":{\\\"https://index.docker.io/v1/\\\":{\\\"auth\\\":\\\"$docker_creds\\\"}}}\" > \"$docker_config_path/config.json\"",
      "docker --config \"$docker_config_path\" pull deepfenceio/deepfence_vulnerability_mapper_ce:latest",
      "rm -rf deepfence_docker",
      "docker run -i --rm --net=host --privileged=true --cpus=\"0.3\" -v /var/run/docker.sock:/var/run/docker.sock:rw deepfenceio/deepfence_vulnerability_mapper_ce:latest -mgmt-console-ip=${var.DEEPFENCE_CONSOLE_IP} -deepfence-key=\"${var.DEEPFENCE_KEY}\" -image-name=\"${var.image_name}:${var.image_tag}\" -fail-cve-count=${var.FAIL_CVE_COUNT} -fail-cve-score=${var.FAIL_CVE_SCORE} -scan-type=\"base,java,python,ruby,php,nodejs,js,dotnet\""
    ]
  }
}
