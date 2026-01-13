Local runner for the Instagram poster Lambda

Usage (WSL or PowerShell):

WSL / bash:
  export S3_BUCKET_NAME=your-bucket
  export DYNAMODB_TABLE_NAME=your-table
  export SECRET_NAME=your-secret-name
  export AWS_PROFILE=your-profile # if using profiles
  STUB_SECRETS=1 node local-run.js

PowerShell:
  $env:S3_BUCKET_NAME='your-bucket'; $env:DYNAMODB_TABLE_NAME='your-table'; $env:SECRET_NAME='your-secret'; $env:AWS_PROFILE='your-profile'; $env:STUB_SECRETS='1'; node .\local-run.js

Notes:
- STUB_SECRETS=1 will inject a fake cached secret value so the runner won't call AWS Secrets Manager.
- This is intended for local testing only. For real runs, unset STUB_SECRETS and ensure AWS credentials are available.
