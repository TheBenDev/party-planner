terraform {
  cloud {
      organization = "benthedev"
      workspaces {
        name = "party_planner"
      }
    }
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
