variable "DEEPFENCE_DOCKER_USERNAME" {
  type      = string
  default   = ""
  sensitive = true
}

variable "DEEPFENCE_DOCKER_PASSWORD" {
  type      = string
  default   = ""
  sensitive = true
}

variable "DEEPFENCE_CONSOLE_IP" {
  type      = string
  default   = "127.0.0.1"
  sensitive = false
}

variable "DEEPFENCE_KEY" {
  type      = string
  default   = ""
  sensitive = true
}

variable "FAIL_CVE_COUNT" {
  type      = string
  default   = "-1"
  sensitive = false
}

variable "FAIL_CVE_SCORE" {
  type      = string
  default   = "-1"
  sensitive = false
}

variable "image_name" {
  type      = string
  default   = "deepfence/nginx-packer-build"
  sensitive = false
}

variable "image_tag" {
  type      = string
  default   = "1.0"
  sensitive = false
}