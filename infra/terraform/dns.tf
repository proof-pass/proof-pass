resource "google_dns_managed_zone" "main" {
  name     = "proofpass-io"
  dns_name = "proofpass.io."

  visibility = "public"
}

resource "google_dns_record_set" "root" {
  managed_zone = google_dns_managed_zone.main.name
  name         = "proofpass.io."
  type         = "A"
  ttl          = 300
  rrdatas      = [google_compute_global_address.frontend.address]
}

resource "google_dns_record_set" "api" {
  managed_zone = google_dns_managed_zone.main.name
  name         = "api.proofpass.io."
  type         = "A"
  ttl          = 300
  rrdatas      = [google_compute_global_address.api.address]
}

# Sendgrid
resource "google_dns_record_set" "sendgrid_url4041" {
  managed_zone = google_dns_managed_zone.main.name
  name         = "url4041.proofpass.io."
  type         = "CNAME"
  ttl          = 300
  rrdatas      = ["sendgrid.net."]
}

resource "google_dns_record_set" "sendgrid_45518523" {
  managed_zone = google_dns_managed_zone.main.name
  name         = "45518523.proofpass.io."
  type         = "CNAME"
  ttl          = 300
  rrdatas      = ["sendgrid.net."]
}

resource "google_dns_record_set" "sendgrid_em1438" {
  managed_zone = google_dns_managed_zone.main.name
  name         = "em1438.proofpass.io."
  type         = "CNAME"
  ttl          = 300
  rrdatas      = ["u45518523.wl024.sendgrid.net."]
}

resource "google_dns_record_set" "sendgrid_s1_dk" {
  managed_zone = google_dns_managed_zone.main.name
  name         = "s1._domainkey.proofpass.io."
  type         = "CNAME"
  ttl          = 300
  rrdatas      = ["s1.domainkey.u45518523.wl024.sendgrid.net."]
}

resource "google_dns_record_set" "sendgrid_s2_dk" {
  managed_zone = google_dns_managed_zone.main.name
  name         = "s2._domainkey.proofpass.io."
  type         = "CNAME"
  ttl          = 300
  rrdatas      = ["s2.domainkey.u45518523.wl024.sendgrid.net."]
}

resource "google_dns_record_set" "sendgrid_dmarc" {
  managed_zone = google_dns_managed_zone.main.name
  name         = "_dmarc.proofpass.io."
  type         = "TXT"
  ttl          = 300
  rrdatas      = ["v=DMARC1; p=none;"]
}

# Zoho Mail
resource "google_dns_record_set" "zohomail" {
  managed_zone = google_dns_managed_zone.main.name
  name         = "proofpass.io."
  type         = "TXT"
  ttl          = 300
  rrdatas = [
    # "zoho-verification=zb65543636.zmverify.zoho.com",
    "\"v=spf1\" \"include:zohomail.com\" \"~all\""
  ]
}

resource "google_dns_record_set" "zohomail_mx" {
  managed_zone = google_dns_managed_zone.main.name
  name         = "proofpass.io."
  type         = "MX"
  ttl          = 300
  rrdatas = [
    "10 mx.zoho.com.",
    "20 mx2.zoho.com.",
    "50 mx3.zoho.com."
  ]
}

resource "google_dns_record_set" "zohomail_dkim" {
  managed_zone = google_dns_managed_zone.main.name
  name         = "zmail._domainkey.proofpass.io."
  type         = "TXT"
  ttl          = 300
  rrdatas      = ["v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC7zKvn23kWFOVQtL+dzg72kIlhBCdN2BPUtKElbZd7Suwhli0efKoUftzOAqEzYVZ8cifVl1XKrfQ3d5bljSem8gp+u2omd3AN9s/j2E00hlingqn7/YGH7cRt1V4MddTz8MX6GkELiYY14IazIFoLKSSNvUZKSITIhUieqaaLDQIDAQAB"]
}

# AWS SES
resource "google_dns_record_set" "aws_ses_dkim1" {
  managed_zone = google_dns_managed_zone.main.name
  name         = "yeosdkwgcipm73ifbjaynq5zk24ktvmu._domainkey.proofpass.io."
  type         = "CNAME"
  ttl          = 300
  rrdatas      = ["yeosdkwgcipm73ifbjaynq5zk24ktvmu.dkim.amazonses.com."]
}

resource "google_dns_record_set" "aws_ses_dkim2" {
  managed_zone = google_dns_managed_zone.main.name
  name         = "ltr5j3dviuwtp5uvvfnew524jskb433a._domainkey.proofpass.io."
  type         = "CNAME"
  ttl          = 300
  rrdatas      = ["ltr5j3dviuwtp5uvvfnew524jskb433a.dkim.amazonses.com."]
}

resource "google_dns_record_set" "aws_ses_dkim3" {
  managed_zone = google_dns_managed_zone.main.name
  name         = "blin3kq6lhygycesbi7waehurk3on7dp._domainkey.proofpass.io."
  type         = "CNAME"
  ttl          = 300
  rrdatas      = ["blin3kq6lhygycesbi7waehurk3on7dp.dkim.amazonses.com."]
}
