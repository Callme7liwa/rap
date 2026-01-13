/**
 * Fix Disabled Primary Accounts
 * 
 * After running merge script, sometimes the primary account is also disabled.
 * This script re-enables primary accounts that should be active.
 */

const { CognitoIdentityProviderClient, ListUsersCommand, AdminEnableUserCommand, AdminListGroupsForUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
require('dotenv').config();

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'eu-north-1'
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || process.env.USER_POOL_ID;

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔧 FIXING DISABLED PRIMARY ACCOUNTS');
  console.log('='.repeat(60) + '\n');

  // Get all users
  const response = await cognitoClient.send(new ListUsersCommand({
    UserPoolId: USER_POOL_ID,
    Limit: 60
  }));

  const users = await Promise.all(
    (response.Users || []).map(async (user) => {
      const groupsResponse = await cognitoClient.send(new AdminListGroupsForUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: user.Username
      }));

      const groups = (groupsResponse.Groups || []).map(g => g.GroupName);
      const emailAttr = user.Attributes?.find(attr => attr.Name === 'email');

      return {
        username: user.Username,
        email: emailAttr?.Value,
        enabled: user.Enabled,
        groups: groups,
        isGoogle: user.Username.startsWith('Google_')
      };
    })
  );

  console.log(`📥 Found ${users.length} total users\n`);

  // Find duplicate emails
  const emailMap = new Map();
  users.forEach(user => {
    if (user.email) {
      const existing = emailMap.get(user.email) || [];
      existing.push(user);
      emailMap.set(user.email, existing);
    }
  });

  const duplicates = Array.from(emailMap.entries())
    .filter(([_, users]) => users.length > 1);

  if (duplicates.length === 0) {
    console.log('✅ No duplicate emails found - nothing to fix!\n');
    return;
  }

  console.log(`⚠️  Found ${duplicates.length} emails with multiple accounts:\n`);

  for (const [email, userList] of duplicates) {
    console.log(`📧 ${email}:`);
    
    // Sort to find primary (prefer non-Google, then oldest)
    userList.sort((a, b) => {
      if (a.isGoogle && !b.isGoogle) return 1;
      if (!a.isGoogle && b.isGoogle) return -1;
      return 0;
    });

    const primary = userList[0];
    const secondaries = userList.slice(1);

    console.log(`   👑 Primary: ${primary.username} ${primary.isGoogle ? '(Google)' : '(Email)'}`);
    console.log(`      Status: ${primary.enabled ? '✅ ENABLED' : '❌ DISABLED'}`);
    
    secondaries.forEach(sec => {
      console.log(`   ➡️  Secondary: ${sec.username} ${sec.isGoogle ? '(Google)' : '(Email)'}`);
      console.log(`      Status: ${sec.enabled ? '✅ ENABLED (should be disabled!)' : '✅ DISABLED'}`);
    });

    // Enable primary if disabled
    if (!primary.enabled) {
      console.log(`\n   🔧 Enabling primary account: ${primary.username}...`);
      
      try {
        await cognitoClient.send(new AdminEnableUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: primary.username
        }));
        console.log(`   ✅ Primary account enabled successfully!\n`);
      } catch (error) {
        console.error(`   ❌ Error enabling account:`, error.message);
      }
    } else {
      console.log(`   ✅ Primary account already enabled\n`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ FIX COMPLETE!');
  console.log('='.repeat(60));
  console.log('\n💡 Refresh the User Management page to see updated status.\n');
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
