const { CognitoIdentityProviderClient, AdminAddUserToGroupCommand, ListUsersCommand } = require('@aws-sdk/client-cognito-identity-provider');
require('dotenv').config();

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'eu-north-1'
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || process.env.USER_POOL_ID;
const GROUP_NAME = 'admin';

async function listAndAddUser() {
  if (!USER_POOL_ID) {
    console.error('❌ USER_POOL_ID not found in environment variables');
    return;
  }

  console.log('Using User Pool:', USER_POOL_ID);
  console.log('\nFetching all users...\n');

  try {
    // List all users
    const result = await client.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Limit: 60
    }));

    if (!result.Users || result.Users.length === 0) {
      console.log('❌ No users found in the user pool');
      return;
    }

    // Display users
    console.log('Available users:');
    result.Users.forEach((user, index) => {
      const email = user.Attributes?.find(attr => attr.Name === 'email')?.Value;
      const status = user.UserStatus;
      console.log(`${index + 1}. ${email} (${status})`);
    });

    // Get email from command line argument
    const emailArg = process.argv[2];
    
    if (!emailArg) {
      console.log('\n📝 Usage: node add-user-to-admin.js <email>');
      console.log('Example: node add-user-to-admin.js ayoubseddiki132@gmail.com');
      return;
    }

    // Find user by email
    const user = result.Users.find(u => 
      u.Attributes?.find(attr => attr.Name === 'email')?.Value === emailArg
    );

    if (!user) {
      console.log(`\n❌ User with email ${emailArg} not found`);
      return;
    }

    console.log(`\n✅ Found user: ${emailArg}`);
    console.log(`Adding to ${GROUP_NAME} group...`);

    // Add user to admin group
    await client.send(new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: user.Username,
      GroupName: GROUP_NAME
    }));

    console.log(`\n✅ Successfully added ${emailArg} to ${GROUP_NAME} group!`);
    console.log('\nThe user now has admin access. They may need to log out and log back in.');

  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      console.error(`\n❌ ${GROUP_NAME} group does not exist.`);
      console.log('Run: node scripts/create-admin-group.js first');
    } else {
      console.error('\n❌ Error:', error.message);
    }
  }
}

listAndAddUser();
