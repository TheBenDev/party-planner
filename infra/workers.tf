resource "cloudflare_workers_route" "party_planner" {
  zone_id     = var.zone_id
  pattern     = "party-planner.${var.domain}/*"
  script = "party-planner"
}
