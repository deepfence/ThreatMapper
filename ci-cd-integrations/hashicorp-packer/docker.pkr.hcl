packer {
  required_plugins {
    docker = {
      version = ">= 0.0.7"
      source  = "github.com/hashicorp/docker"
    }
  }
}

# DEEPFENCE_CONSOLE_URL variable can be overidden in variables.pkrvars.hcl
variable "DEEPFENCE_CONSOLE_URL" {
  type      = string
  default   = "127.0.0.1"
  sensitive = false
}

# DEEPFENCE_KEY variable can be overidden in variables.pkrvars.hcl
variable "DEEPFENCE_KEY" {
  type      = string
  default   = "api key"
  sensitive = true
}

# FAIL_CVE_COUNT variable can be overidden in variables.pkrvars.hcl
variable "FAIL_CVE_COUNT" {
  type      = string
  default   = "8"
  sensitive = false
}

# FAIL_CRITICAL_CVE_COUNT variable can be overidden in variables.pkrvars.hcl
variable "FAIL_CRITICAL_CVE_COUNT" {
  type      = string
  default   = "1"
  sensitive = false
}

# FAIL_HIGH_CVE_COUNT variable can be overidden in variables.pkrvars.hcl
variable "FAIL_HIGH_CVE_COUNT" {
  type      = string
  default   = "5"
  sensitive = false
}

# FAIL_MEDIUM_CVE_COUNT variable can be overidden in variables.pkrvars.hcl
variable "FAIL_MEDIUM_CVE_COUNT" {
  type      = string
  default   = "10"
  sensitive = false
}

# FAIL_LOW_CVE_COUNT variable can be overidden in variables.pkrvars.hcl
variable "FAIL_LOW_CVE_COUNT" {
  type      = string
  default   = "20"
  sensitive = false
}

# FAIL_CVE_SCORE variable can be overidden in variables.pkrvars.hcl
variable "FAIL_CVE_SCORE" {
  type      = string
  default   = "9"
  sensitive = false
}

# image_name variable can be overidden in variables.pkrvars.hcl
variable "image_name" {
  type      = string
  default   = "ubuntu"
  sensitive = false
}

# image_tag variable can be overidden in variables.pkrvars.hcl
variable "image_tag" {
  type      = string
  default   = "latest"
  sensitive = false
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
    tags        = ["${var.image_tag}"]
  }

  post-processor "shell-local" {
    inline = [
      "docker pull deepfenceio/deepfence_package_scanner_ce:1.3.1",
      "docker run -i --rm --net=host --privileged=true --cpus=\"0.3\" -v /var/run/docker.sock:/var/run/docker.sock:rw deepfenceio/deepfence_package_scanner_ce:1.3.1 -mgmt-console-url=${var.DEEPFENCE_CONSOLE_URL} -deepfence-key=\"${var.DEEPFENCE_KEY}\" -vulnerability-scan=\"true\" -output=\"table\" -mode=\"local\" -source=\"${var.image_name}:${var.image_tag}\" -fail-on-count=${var.FAIL_CVE_COUNT} -fail-on-critical-count=${var.FAIL_CRITICAL_CVE_COUNT} -fail-on-high-count=${var.FAIL_HIGH_CVE_COUNT} -fail-on-medium-count=${var.FAIL_MEDIUM_CVE_COUNT} -fail-on-low-count=${var.FAIL_LOW_CVE_COUNT} -fail-on-score=${var.FAIL_CVE_SCORE} -scan-type=\"base,java,python,ruby,php,nodejs,js,dotnet\""
    ]
  }
}
