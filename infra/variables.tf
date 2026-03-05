# Core Cloudflare Configuration
variable "cloudflare_api_token" {
  description = "Cloudflare API token with appropriate permissions"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "zone_id" {
  type = string
  description = "Cloudflare zone ID"
}

variable "domain" {
  default = "benthedev.com"
}
