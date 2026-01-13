variable "project_name" {
  description = "Nom du projet (préfixe des ressources)"
  type        = string
}

variable "environment" {
  description = "Environnement (ex: dev, staging, prod)"
  type        = string
}

variable "instagram_account_id" {
  description = "Account ID Instagram Business"
  type        = string
}

variable "instagram_access_token" {
  description = "Access token Instagram (uniquement si tu gères la version du secret via TF)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "manage_secret_version" {
  description = "Si true, crée/écrase la version du secret via Terraform (⚠️ stocké dans le state)"
  type        = bool
  default     = false
}

variable "cognito_callback_urls" {
  description = "Cognito callback URLs for OAuth"
  type        = list(string)
  default     = [
    "http://localhost:8089",
    "http://localhost:8089/",
    "http://localhost:8089/login",
    "http://localhost:8090",
    "http://localhost:8090/",
    "http://localhost:8090/login"
  ]
}

variable "cognito_logout_urls" {
  description = "Cognito logout URLs for OAuth"
  type        = list(string)
  default     = [
    "http://localhost:8089",
    "http://localhost:8089/",
    "http://localhost:8089/login",
    "http://localhost:8090",
    "http://localhost:8090/",
    "http://localhost:8090/login"
  ]
}

variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  default     = "27911664626-cmk9n0b53mnhnpk4261skiu32fn9looe.apps.googleusercontent.com"
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  default     = "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"
  sensitive   = true
}

variable "user_uploads_retention_days" {
  description = "Number of days to retain temporary uploads in S3"
  type        = number
  default     = 30
}
