resource "google_storage_bucket" "protocol_gadgets" {
  name     = "protocol-gadgets"
  location = "US"

  // delete bucket and contents on destroy.
  force_destroy = true

  cors {
    origin          = ["*"]
    method          = ["GET", "OPTIONS"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

resource "google_storage_bucket_iam_member" "public" {
  bucket = google_storage_bucket.protocol_gadgets.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}
