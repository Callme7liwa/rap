output "lambda_function_arn" {
  description = "ARN de la Lambda"
  value       = aws_lambda_function.instagram_poster.arn
}

output "s3_bucket_name" {
  description = "Nom du bucket S3"
  value       = aws_s3_bucket.lyrics_images.bucket
}

output "s3_bucket_arn" {
  description = "ARN du bucket S3"
  value       = aws_s3_bucket.lyrics_images.arn
}

output "secret_name" {
  description = "Nom du secret Secrets Manager"
  value       = aws_secretsmanager_secret.instagram_token.name
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = aws_cognito_user_pool.main.arn
}

output "cognito_client_id" {
  description = "Cognito User Pool Client ID"
  value       = aws_cognito_user_pool_client.web_client.id
}

output "cognito_domain" {
  description = "Cognito User Pool Domain"
  value       = aws_cognito_user_pool_domain.main.domain
}

output "cognito_issuer_url" {
  description = "Cognito JWT Issuer URL"
  value       = "https://cognito-idp.${data.aws_region.current.name}.amazonaws.com/${aws_cognito_user_pool.main.id}"
}

# User Uploads Bucket
output "user_uploads_bucket_name" {
  description = "User uploads S3 bucket name"
  value       = aws_s3_bucket.user_uploads.id
}

output "user_uploads_bucket_arn" {
  description = "User uploads S3 bucket ARN"
  value       = aws_s3_bucket.user_uploads.arn
}

# DynamoDB Tables
output "dynamodb_tables" {
  description = "DynamoDB table names"
  value = {
    users_profile  = aws_dynamodb_table.users_profile.name
    blog_posts     = aws_dynamodb_table.blog_posts.name
    blog_comments  = aws_dynamodb_table.blog_comments.name
    votes          = aws_dynamodb_table.votes.name
    user_uploads   = aws_dynamodb_table.user_uploads.name
    artists        = aws_dynamodb_table.artists.name
    albums         = aws_dynamodb_table.albums.name
    songs          = aws_dynamodb_table.songs.name
  }
}

data "aws_region" "current" {}
