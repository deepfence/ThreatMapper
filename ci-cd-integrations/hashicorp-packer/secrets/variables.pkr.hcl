# DEEPFENCE_CONSOLE_URL variable can be overidden in variables.pkrvars.hcl
variable "DEEPFENCE_CONSOLE_URL" {
  type      = string
  default   = ""
  sensitive = false
}

# DEEPFENCE_KEY variable can be overidden in variables.pkrvars.hcl
variable "DEEPFENCE_KEY" {
  type      = string
  default   = ""
  sensitive = true
}

# FAIL_SECRET_COUNT variable can be overidden in variables.pkrvars.hcl
variable "FAIL_SECRET_COUNT" {
  type      = string
  default   = "100"
  sensitive = false
}

# FAIL_HIGH_SECRET_COUNT variable can be overidden in variables.pkrvars.hcl
variable "FAIL_HIGH_SECRET_COUNT" {
  type      = string
  default   = "5"
  sensitive = false
}

# FAIL_MEDIUM_SECRET_COUNT variable can be overidden in variables.pkrvars.hcl
variable "FAIL_MEDIUM_SECRET_COUNT" {
  type      = string
  default   = "10"
  sensitive = false
}

# FAIL_LOW_SECRET_COUNT variable can be overidden in variables.pkrvars.hcl
variable "FAIL_LOW_SECRET_COUNT" {
  type      = string
  default   = "20"
  sensitive = false
}

# image_name variable can be overidden in variables.pkrvars.hcl
variable "image_name" {
  type      = string
  default   = "packer-nginx"
  sensitive = false
}

# image_tag variable can be overidden in variables.pkrvars.hcl
variable "image_tag" {
  type      = string
  default   = "1.0"
  sensitive = false
}

