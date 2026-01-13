const { S3Client, PutBucketPolicyCommand, GetBucketPolicyCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'eu-north-1' });
const BUCKET_NAME = process.env.USER_UPLOADS_BUCKET || 'lyricscape-user-uploads-prod';

async function setupBucketPolicy() {
  console.log(`Setting up bucket policy for: ${BUCKET_NAME}`);
  
  const bucketPolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PublicReadProfilePictures',
        Effect: 'Allow',
        Principal: '*',
        Action: 's3:GetObject',
        Resource: `arn:aws:s3:::${BUCKET_NAME}/users/*/profile-pictures/*`
      }
    ]
  };

  try {
    // Try to get existing policy first
    try {
      const existingPolicy = await s3Client.send(
        new GetBucketPolicyCommand({ Bucket: BUCKET_NAME })
      );
      console.log('Current bucket policy:', existingPolicy.Policy);
    } catch (err) {
      if (err.name === 'NoSuchBucketPolicy') {
        console.log('No existing bucket policy found.');
      }
    }

    // Set the new policy
    await s3Client.send(
      new PutBucketPolicyCommand({
        Bucket: BUCKET_NAME,
        Policy: JSON.stringify(bucketPolicy)
      })
    );

    console.log('✅ Bucket policy updated successfully!');
    console.log('\nPolicy Details:');
    console.log('- Public read access enabled for: users/*/profile-pictures/*');
    console.log('- All other files remain private');
    console.log('\nProfile pictures will now be publicly accessible via URLs like:');
    console.log(`https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'eu-north-1'}.amazonaws.com/users/{userId}/profile-pictures/{filename}`);
    
  } catch (error) {
    console.error('❌ Error setting bucket policy:', error);
    
    if (error.name === 'NoSuchBucket') {
      console.error(`\n⚠️  Bucket "${BUCKET_NAME}" does not exist!`);
      console.error('Please create the bucket first or check the bucket name.');
    } else if (error.name === 'AccessDenied') {
      console.error('\n⚠️  Access denied! Make sure you have permissions to modify bucket policies.');
      console.error('Required IAM permission: s3:PutBucketPolicy');
    }
    
    throw error;
  }
}

// Run the script
setupBucketPolicy()
  .then(() => {
    console.log('\n✅ Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  });
