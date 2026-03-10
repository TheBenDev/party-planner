resource "cloudflare_workers_route" "web" {
  zone_id     = var.zone_id
  pattern     = "party-planner.${var.domain}/*"
}
