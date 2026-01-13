terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

# Tout en eu-north-1 (Stockholm)
provider "aws" {
  region = "eu-north-1"
}

########################################
# S3: bucket d'images temporaires
########################################

resource "aws_s3_bucket" "lyrics_images" {
  bucket = "${var.project_name}-lyrics-images-${var.environment}"

  tags = {
    Name        = "Lyrics Card Images"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Chiffrement côté serveur (SSE-S3)
resource "aws_s3_bucket_server_side_encryption_configuration" "lyrics_images" {
  bucket = aws_s3_bucket.lyrics_images.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# Ownership controls (désactive les ACLs, owner = bucket)
resource "aws_s3_bucket_ownership_controls" "lyrics_images" {
  bucket = aws_s3_bucket.lyrics_images.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# Versioning recommandé
resource "aws_s3_bucket_versioning" "lyrics_images" {
  bucket = aws_s3_bucket.lyrics_images.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Bloquer tout accès public
resource "aws_s3_bucket_public_access_block" "lyrics_images" {
  bucket = aws_s3_bucket.lyrics_images.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle: purge après 7 jours (filter {} requis)
resource "aws_s3_bucket_lifecycle_configuration" "lyrics_images" {
  bucket = aws_s3_bucket.lyrics_images.id

  rule {
    id     = "delete-old-images"
    status = "Enabled"

    filter {}

    expiration {
      days = 7
    }
  }
}

# Politique: forcer TLS (deny si pas HTTPS)
resource "aws_s3_bucket_policy" "lyrics_images_tls" {
  bucket = aws_s3_bucket.lyrics_images.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Sid      = "DenyInsecureTransport",
      Effect   = "Deny",
      Principal= "*",
      Action   = "s3:*",
      Resource = [
        aws_s3_bucket.lyrics_images.arn,
        "${aws_s3_bucket.lyrics_images.arn}/*"
      ],
      Condition = {
        Bool = { "aws:SecureTransport" : "false" }
      }
    }]
  })
}

########################################
# Secrets Manager (token Instagram)
########################################
# ⚠️ Si tu utilises ce bloc 'secret_version', le token sera dans le state Terraform.
# Alternative recommandée: commenter secret_version, créer la version manuellement,
# et ne garder que le secret + lecture par la Lambda.
resource "aws_secretsmanager_secret" "instagram_token" {
  name        = "${var.project_name}-instagram-token-${var.environment}"
  description = "Instagram API Access Token"

  tags = {
    Name        = "Instagram Token"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_secretsmanager_secret_version" "instagram_token" {
  count       = var.manage_secret_version ? 1 : 0
  secret_id   = aws_secretsmanager_secret.instagram_token.id
  secret_string = jsonencode({
    access_token = var.instagram_access_token
    account_id   = var.instagram_account_id
  })
}

########################################
# DynamoDB: suivi des uploads
########################################

resource "aws_dynamodb_table" "uploaded_images" {
  name         = "${var.project_name}-uploaded-images-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "image_id"

  attribute {
    name = "image_id"
    type = "S"
  }

  attribute {
    name = "uploaded_at"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name            = "StatusIndex"
    hash_key        = "status"
    range_key       = "uploaded_at"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name        = "Uploaded Images Tracker"
    Environment = var.environment
    Project     = var.project_name
  }
}

########################################
# IAM pour Lambda
########################################

resource "aws_iam_role" "lambda_instagram_poster" {
  name = "${var.project_name}-lambda-instagram-poster-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action    = "sts:AssumeRole",
      Effect    = "Allow",
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })

  tags = {
    Name        = "Lambda Instagram Poster Role"
    Environment = var.environment
  }
}

# Accès S3
resource "aws_iam_role_policy" "lambda_s3_access" {
  name = "s3-access"
  role = aws_iam_role.lambda_instagram_poster.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Action = [
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      Resource = [
        aws_s3_bucket.lyrics_images.arn,
        "${aws_s3_bucket.lyrics_images.arn}/*"
      ]
    }]
  })
}

# Accès DynamoDB
resource "aws_iam_role_policy" "lambda_dynamodb_access" {
  name = "dynamodb-access"
  role = aws_iam_role.lambda_instagram_poster.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Action = [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      Resource = [
        aws_dynamodb_table.uploaded_images.arn,
        "${aws_dynamodb_table.uploaded_images.arn}/index/*"
      ]
    }]
  })
}

# Accès Secret Manager (lecture du secret)
resource "aws_iam_role_policy" "lambda_secrets_access" {
  name = "secrets-access"
  role = aws_iam_role.lambda_instagram_poster.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect  = "Allow",
      Action  = ["secretsmanager:GetSecretValue"],
      Resource= aws_secretsmanager_secret.instagram_token.arn
    }]
  })
}

# Logs CloudWatch gérés par AWS (policy managée)
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_instagram_poster.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

########################################
# Lambda
########################################

resource "aws_lambda_function" "instagram_poster" {
  filename         = "../lambda/instagram-poster.zip"
  function_name    = "${var.project_name}-instagram-poster-${var.environment}"
  role             = aws_iam_role.lambda_instagram_poster.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 300
  memory_size      = 512

  # Hash pour déployer uniquement si l'archive change
  source_code_hash = fileexists("../lambda/instagram-poster.zip") ? filebase64sha256("../lambda/instagram-poster.zip") : null

  environment {
    variables = {
      S3_BUCKET_NAME      = aws_s3_bucket.lyrics_images.id
      DYNAMODB_TABLE_NAME = aws_dynamodb_table.uploaded_images.name
      SECRET_NAME         = aws_secretsmanager_secret.instagram_token.name
      ENVIRONMENT         = var.environment
    }
  }

  tags = {
    Name        = "Instagram Poster Lambda"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Groupe de logs avec rétention
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.instagram_poster.function_name}"
  retention_in_days = 14

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

########################################
# EventBridge: planification (UTC)
########################################
# Rappel: ces CRON sont en UTC (9:00 et 18:00 UTC)

resource "aws_cloudwatch_event_rule" "morning_post" {
  name                = "${var.project_name}-morning-post-${var.environment}"
  description         = "Trigger Instagram post in the morning"
  schedule_expression = "cron(0 9 * * ? *)"
  tags = {
    Name        = "Morning Instagram Post"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_event_rule" "evening_post" {
  name                = "${var.project_name}-evening-post-${var.environment}"
  description         = "Trigger Instagram post in the evening"
  schedule_expression = "cron(0 18 * * ? *)"
  tags = {
    Name        = "Evening Instagram Post"
    Environment = var.environment
  }
}

# Permissions d'invocation Lambda
resource "aws_lambda_permission" "allow_eventbridge_morning" {
  statement_id  = "AllowExecutionFromEventBridgeMorning"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.instagram_poster.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.morning_post.arn
}

resource "aws_lambda_permission" "allow_eventbridge_evening" {
  statement_id  = "AllowExecutionFromEventBridgeEvening"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.instagram_poster.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.evening_post.arn
}

# Cibles EventBridge
resource "aws_cloudwatch_event_target" "lambda_morning" {
  rule      = aws_cloudwatch_event_rule.morning_post.name
  target_id = "LambdaTargetMorning"
  arn       = aws_lambda_function.instagram_poster.arn

  input = jsonencode({ trigger_time = "morning" })
}

resource "aws_cloudwatch_event_target" "lambda_evening" {
  rule      = aws_cloudwatch_event_rule.evening_post.name
  target_id = "LambdaTargetEvening"
  arn       = aws_lambda_function.instagram_poster.arn

  input = jsonencode({ trigger_time = "evening" })
}

########################################
# CloudWatch Alarme: erreurs Lambda
########################################

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.project_name}-lambda-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "This metric monitors lambda errors"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.instagram_poster.function_name
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

########################################
# AWS Cognito: User Authentication
########################################

# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-user-pool-${var.environment}"

  # Username configuration - use email as username
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # Password policy
  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Email configuration (using default Cognito email for MVP)
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # User attribute schema
  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true  # Changed to true to allow OAuth providers to set email

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    name                = "name"
    attribute_data_type = "String"
    required            = false
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  # MFA configuration (disabled for MVP - can enable later with SMS/TOTP)
  mfa_configuration = "OFF"

  tags = {
    Name        = "User Pool"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "web_client" {
  name         = "${var.project_name}-web-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id

  # OAuth configuration
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  callback_urls                        = var.cognito_callback_urls
  logout_urls                          = var.cognito_logout_urls

  # Supported identity providers - COGNITO + Google
  supported_identity_providers = ["COGNITO", "Google"]

  # Token validity
  id_token_validity      = 60  # minutes
  access_token_validity  = 60  # minutes
  refresh_token_validity = 30  # days

  token_validity_units {
    id_token      = "minutes"
    access_token  = "minutes"
    refresh_token = "days"
  }

  # Enable SRP authentication
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]

  # Prevent user existence errors (security best practice)
  prevent_user_existence_errors = "ENABLED"

  # Read attributes only - NO write_attributes when using OAuth providers
  # OAuth providers manage their own attributes and Cognito cannot override them
  read_attributes = [
    "email",
    "email_verified",
    "name"
  ]

  lifecycle {
    create_before_destroy = true
  }
}

# Cognito User Pool Domain (for hosted UI)
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project_name}-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id
}

# Optional: Google Identity Provider (uncomment to enable)
resource "aws_cognito_identity_provider" "google" {
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    authorize_scopes = "email profile openid"
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
    name     = "name"
  }
}

# Optional: Facebook Identity Provider (uncomment to enable)
# resource "aws_cognito_identity_provider" "facebook" {
#   user_pool_id  = aws_cognito_user_pool.main.id
#   provider_name = "Facebook"
#   provider_type = "Facebook"

#   provider_details = {
#     authorize_scopes = "email public_profile"
#     client_id        = var.facebook_client_id
#     client_secret    = var.facebook_client_secret
#   }

#   attribute_mapping = {
#     email    = "email"
#     username = "id"
#     name     = "name"
#   }
# }

########################################
# USER DATA & CONTENT MANAGEMENT
########################################

# ============================================
# DynamoDB Table: Users Profile
# ============================================
resource "aws_dynamodb_table" "users_profile" {
  name           = "${var.project_name}-users-profile-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "EmailIndex"
    hash_key        = "email"
    projection_type = "ALL"
  }

  tags = {
    Name        = "Users Profile"
    Environment = var.environment
    Project     = var.project_name
  }
}

# ============================================
# DynamoDB Table: Blog Posts
# ============================================
resource "aws_dynamodb_table" "blog_posts" {
  name           = "${var.project_name}-blog-posts-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "post_id"
  range_key      = "created_at"

  attribute {
    name = "post_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "N"
  }

  attribute {
    name = "author_id"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "slug"
    type = "S"
  }

  global_secondary_index {
    name            = "AuthorIndex"
    hash_key        = "author_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "StatusIndex"
    hash_key        = "status"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "SlugIndex"
    hash_key        = "slug"
    projection_type = "ALL"
  }

  tags = {
    Name        = "Blog Posts"
    Environment = var.environment
    Project     = var.project_name
  }
}

# ============================================
# DynamoDB Table: Blog Comments
# ============================================
resource "aws_dynamodb_table" "blog_comments" {
  name           = "${var.project_name}-blog-comments-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "comment_id"
  range_key      = "created_at"

  attribute {
    name = "comment_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "N"
  }

  attribute {
    name = "post_id"
    type = "S"
  }

  attribute {
    name = "author_id"
    type = "S"
  }

  attribute {
    name = "post_slug"
    type = "S"
  }

  global_secondary_index {
    name            = "PostIndex"
    hash_key        = "post_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "AuthorIndex"
    hash_key        = "author_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "PostSlugIndex"
    hash_key        = "post_slug"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  tags = {
    Name        = "Blog Comments"
    Environment = var.environment
    Project     = var.project_name
  }
}

# ============================================
# DynamoDB Table: Votes
# ============================================
resource "aws_dynamodb_table" "votes" {
  name           = "${var.project_name}-votes-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "vote_id"
  range_key      = "created_at"

  attribute {
    name = "vote_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "N"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "poll_id"
    type = "S"
  }

  global_secondary_index {
    name            = "UserVotesIndex"
    hash_key        = "user_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "PollVotesIndex"
    hash_key        = "poll_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  tags = {
    Name        = "Votes"
    Environment = var.environment
    Project     = var.project_name
  }
}

# ============================================
# DynamoDB Table: User Uploads (Metadata)
# ============================================
resource "aws_dynamodb_table" "user_uploads" {
  name           = "${var.project_name}-user-uploads-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "upload_id"
  range_key      = "created_at"

  attribute {
    name = "upload_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "N"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "visibility"
    type = "S"
  }

  global_secondary_index {
    name            = "UserUploadsIndex"
    hash_key        = "user_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "VisibilityIndex"
    hash_key        = "visibility"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = {
    Name        = "User Uploads"
    Environment = var.environment
    Project     = var.project_name
  }
}

# ============================================
# DynamoDB Table: Artists
# ============================================
resource "aws_dynamodb_table" "artists" {
  name           = "${var.project_name}-artists-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "artist_id"

  attribute {
    name = "artist_id"
    type = "S"
  }

  attribute {
    name = "name"
    type = "S"
  }

  attribute {
    name = "created_by"
    type = "S"
  }

  global_secondary_index {
    name            = "NameIndex"
    hash_key        = "name"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "CreatorIndex"
    hash_key        = "created_by"
    projection_type = "ALL"
  }

  tags = {
    Name        = "Artists"
    Environment = var.environment
    Project     = var.project_name
  }
}

# ============================================
# DynamoDB Table: Albums
# ============================================
resource "aws_dynamodb_table" "albums" {
  name           = "${var.project_name}-albums-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "album_id"

  attribute {
    name = "album_id"
    type = "S"
  }

  attribute {
    name = "artist_id"
    type = "S"
  }

  attribute {
    name = "release_date"
    type = "N"
  }

  global_secondary_index {
    name            = "ArtistAlbumsIndex"
    hash_key        = "artist_id"
    range_key       = "release_date"
    projection_type = "ALL"
  }

  tags = {
    Name        = "Albums"
    Environment = var.environment
    Project     = var.project_name
  }
}

# ============================================
# DynamoDB Table: Songs
# ============================================
resource "aws_dynamodb_table" "songs" {
  name           = "${var.project_name}-songs-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "song_id"

  attribute {
    name = "song_id"
    type = "S"
  }

  attribute {
    name = "artist_id"
    type = "S"
  }

  attribute {
    name = "album_id"
    type = "S"
  }

  global_secondary_index {
    name            = "ArtistSongsIndex"
    hash_key        = "artist_id"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "AlbumSongsIndex"
    hash_key        = "album_id"
    projection_type = "ALL"
  }

  tags = {
    Name        = "Songs"
    Environment = var.environment
    Project     = var.project_name
  }
}

########################################
# S3 BUCKET: User Uploads (Private)
########################################

resource "aws_s3_bucket" "user_uploads" {
  bucket = "${var.project_name}-user-uploads-${var.environment}"

  tags = {
    Name        = "User Uploads"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Bloquer l'accès public
resource "aws_s3_bucket_public_access_block" "user_uploads" {
  bucket = aws_s3_bucket.user_uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Versioning
resource "aws_s3_bucket_versioning" "user_uploads" {
  bucket = aws_s3_bucket.user_uploads.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle - Supprimer les fichiers temporaires après 30 jours
resource "aws_s3_bucket_lifecycle_configuration" "user_uploads" {
  bucket = aws_s3_bucket.user_uploads.id

  rule {
    id     = "delete-temp-files"
    status = "Enabled"

    filter {
      prefix = "temp/"
    }

    expiration {
      days = var.user_uploads_retention_days
    }
  }

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    # Filter vide pour appliquer à tous les objets
    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }

  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# CORS pour les uploads depuis le frontend
resource "aws_s3_bucket_cors_configuration" "user_uploads" {
  bucket = aws_s3_bucket.user_uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE"]
    allowed_origins = concat(
      var.cognito_callback_urls,
      ["https://*.amazoncognito.com"]
    )
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Encryption at rest
resource "aws_s3_bucket_server_side_encryption_configuration" "user_uploads" {
  bucket = aws_s3_bucket.user_uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Policy pour TLS only
resource "aws_s3_bucket_policy" "user_uploads_tls" {
  bucket = aws_s3_bucket.user_uploads.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnforceTLS"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:*"
        Resource = [
          aws_s3_bucket.user_uploads.arn,
          "${aws_s3_bucket.user_uploads.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}
