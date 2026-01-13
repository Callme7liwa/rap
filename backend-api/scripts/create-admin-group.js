const { 
  CognitoIdentityProviderClient, 
  CreateGroupCommand,
  AdminAddUserToGroupCommand 
} = require('@aws-sdk/client-cognito-identity-provider');
require('dotenv').config();

const client = new CognitoIdentityProviderClient({ 
  region: process.env.AWS_REGION || 'eu-north-1' 
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || process.env.USER_POOL_ID;
const ADMIN_EMAIL = 'ayoubseddiki132@gmail.com';

async function createAdminGroupAndAddUser() {
  try {
    if (!USER_POOL_ID || USER_POOL_ID.includes('your_pool_id')) {
      console.error('❌ USER_POOL_ID not configured properly in .env file');
      console.log('Add this to backend-api/.env:');
      console.log('USER_POOL_ID=your_cognito_user_pool_id');
      return;
    }

    console.log(`Using User Pool: ${USER_POOL_ID}`);
    
    // Step 1: Create admin group
    console.log('Creating admin group...');
    
    try {
      await client.send(new CreateGroupCommand({
        UserPoolId: USER_POOL_ID,
        GroupName: 'admin',
        Description: 'Administrators with full access',
      }));
      console.log('✅ Admin group created successfully!');
    } catch (error) {
      if (error.name === 'GroupExistsException') {
        console.log('ℹ️  Admin group already exists, continuing...');
      } else {
        throw error;
      }
    }

    // Step 2: Add user to admin group
    console.log(`\nAdding ${ADMIN_EMAIL} to admin group...`);
    
    await client.send(new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: ADMIN_EMAIL,
      GroupName: 'admin'
    }));
    
    console.log(`✅ Successfully added ${ADMIN_EMAIL} to admin group!`);
    console.log('\n🎉 Setup complete! You now have admin access.');
    
  } catch (error) {
    if (error.name === 'UserNotFoundException') {
      console.error(`\n❌ User ${ADMIN_EMAIL} not found.`);
      console.log('\nThe user must sign up first. Steps:');
      console.log('1. Go to your app login page');
      console.log('2. Sign up with email: ayoubseddiki132@gmail.com');
      console.log('3. Verify your email');
      console.log('4. Run this script again');
    } else {
      console.error('\n❌ Error:', error.message);
      console.error('\nMake sure:');
      console.log('1. AWS credentials are configured');
      console.log('2. USER_POOL_ID is set in .env file');
      console.log('3. You have permission to manage Cognito');
    }
  }
}

createAdminGroupAndAddUser();
