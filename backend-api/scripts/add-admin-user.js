const { 
  CognitoIdentityProviderClient, 
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand 
} = require('@aws-sdk/client-cognito-identity-provider');
require('dotenv').config();

const client = new CognitoIdentityProviderClient({ 
  region: process.env.AWS_REGION || 'eu-north-1' 
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || process.env.USER_POOL_ID;
const ADMIN_EMAIL = 'ayoubseddiki132@gmail.com';

async function addAdminUser() {
  try {
    if (!USER_POOL_ID || USER_POOL_ID.includes('your_pool_id')) {
      console.error('❌ USER_POOL_ID not configured properly in .env file');
      return;
    }

    console.log(`Using User Pool: ${USER_POOL_ID}`);
    console.log(`Adding ${ADMIN_EMAIL} to admin group...`);
    
    // Add user to admin group (user should already exist)
    const command = new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: ADMIN_EMAIL,
      GroupName: 'admin'
    });
    
    await client.send(command);
    console.log(`✅ Successfully added ${ADMIN_EMAIL} to admin group!`);
    
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      console.error('❌ Admin group does not exist. Create it in Cognito console first.');
      console.log('\nSteps to create admin group:');
      console.log('1. Go to AWS Cognito Console');
      console.log('2. Select your User Pool');
      console.log('3. Go to "Groups" tab');
      console.log('4. Click "Create group"');
      console.log('5. Name it "admin" and save');
      console.log('6. Run this script again');
    } else if (error.name === 'UserNotFoundException') {
      console.error(`❌ User ${ADMIN_EMAIL} not found. User must sign up first.`);
    } else {
      console.error('Error adding admin user:', error);
    }
  }
}

addAdminUser();
