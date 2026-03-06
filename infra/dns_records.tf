resource "cloudflare_dns_record" "mx_alt3" {
  content  = "alt3.aspmx.l.google.com"
  name     = var.domain
  priority = 10
  proxied  = false
  tags     = []
  ttl      = 3600
  type     = "MX"
  zone_id  = var.zone_id
  settings = {}
}

resource "cloudflare_dns_record" "mx_alt2" {
  content  = "alt2.aspmx.l.google.com"
  name     = var.domain
  priority = 5
  proxied  = false
  tags     = []
  ttl      = 3600
  type     = "MX"
  zone_id  = var.zone_id
  settings = {}
}

resource "cloudflare_dns_record" "mx_alt4" {
  content  = "alt4.aspmx.l.google.com"
  name     = var.domain
  priority = 10
  proxied  = false
  tags     = []
  ttl      = 3600
  type     = "MX"
  zone_id  = var.zone_id
  settings = {}
}

resource "cloudflare_dns_record" "mx_alt1" {
  content  = "alt1.aspmx.l.google.com"
  name     = var.domain
  priority = 5
  proxied  = false
  tags     = []
  ttl      = 3600
  type     = "MX"
  zone_id  = var.zone_id
  settings = {}
}

resource "cloudflare_dns_record" "mx_primary" {
  content  = "aspmx.l.google.com"
  name     = var.domain
  priority = 1
  proxied  = false
  tags     = []
  ttl      = 3600
  type     = "MX"
  zone_id  = var.zone_id
  settings = {}
}

resource "cloudflare_dns_record" "txt_spf" {
  content  = "\"v=spf1 include:_spf.google.com ~all\""
  name     = var.domain
  proxied  = false
  tags     = []
  ttl      = 3600
  type     = "TXT"
  zone_id  = var.zone_id
  settings = {}
}

resource "cloudflare_dns_record" "txt_google_site_verification" {
  content  = "\"google-site-verification=rMDYsa0d5z1UK1QCESahISyOneVa-irjrAKHZiShC70\""
  name     = var.domain
  proxied  = false
  tags     = []
  ttl      = 3600
  type     = "TXT"
  zone_id  = var.zone_id
  settings = {}
}
