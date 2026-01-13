/**
 * Test Admin Users
 * Check which users are in the admin group
 */

const { CognitoIdentityProviderClient, ListUsersCommand, AdminListGroupsForUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
require('dotenv').config();

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'eu-north-1'
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || process.env.USER_POOL_ID;

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('👥 CHECKING ADMIN USERS');
  console.log('='.repeat(60) + '\n');

  const response = await cognitoClient.send(new ListUsersCommand({
    UserPoolId: USER_POOL_ID,
    Limit: 60
  }));

  console.log(`📥 Found ${response.Users?.length || 0} total users\n`);

  const usersWithGroups = await Promise.all(
    (response.Users || []).map(async (user) => {
      try {
        const groupsResponse = await cognitoClient.send(new AdminListGroupsForUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: user.Username
        }));

        const groups = (groupsResponse.Groups || []).map(g => g.GroupName);
        const emailAttr = user.Attributes?.find(attr => attr.Name === 'email');

        return {
          username: user.Username,
          email: emailAttr?.Value,
          groups: groups,
          enabled: user.Enabled
        };
      } catch (error) {
        console.error(`Error for ${user.Username}:`, error.message);
        return null;
      }
    })
  );

  const validUsers = usersWithGroups.filter(u => u !== null);
  const adminUsers = validUsers.filter(u => u.groups.includes('admin'));
  const regularUsers = validUsers.filter(u => !u.groups.includes('admin'));

  console.log(`👑 ADMIN USERS (${adminUsers.length}):`);
  adminUsers.forEach(user => {
    console.log(`   ✅ ${user.username}`);
    console.log(`      Email: ${user.email || 'N/A'}`);
    console.log(`      Status: ${user.enabled ? 'Enabled' : 'Disabled'}`);
    console.log(`      Groups: [${user.groups.join(', ')}]`);
    console.log('');
  });

  console.log(`👤 REGULAR USERS (${regularUsers.length}):`);
  regularUsers.forEach(user => {
    console.log(`   • ${user.username} (${user.email || 'N/A'})`);
  });

  console.log('\n' + '='.repeat(60));
  console.log(`📊 SUMMARY: ${adminUsers.length} admins, ${regularUsers.length} regular users`);
  console.log('='.repeat(60) + '\n');
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
