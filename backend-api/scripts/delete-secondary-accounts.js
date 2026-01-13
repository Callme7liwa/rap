/**
 * Delete Secondary Accounts
 * 
 * After merging duplicates, this script PERMANENTLY DELETES secondary accounts
 * to clean up the user pool and remove duplicate badges from UI.
 * 
 * WARNING: This is irreversible! Only run after successful merge.
 */

const { CognitoIdentityProviderClient, ListUsersCommand, AdminDeleteUserCommand, AdminListGroupsForUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
require('dotenv').config();

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'eu-north-1'
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || process.env.USER_POOL_ID;

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');

  console.log('\n' + '='.repeat(60));
  console.log('🗑️  DELETE SECONDARY ACCOUNTS');
  console.log('='.repeat(60) + '\n');

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made');
    console.log('   Use --execute to permanently delete accounts\n');
  } else {
    console.log('⚠️  EXECUTE MODE - ACCOUNTS WILL BE PERMANENTLY DELETED!');
    console.log('   This action cannot be undone!\n');
  }

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
        isGoogle: user.Username.startsWith('Google_'),
        createdAt: user.UserCreateDate
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
    console.log('✅ No duplicate emails found - nothing to delete!\n');
    return;
  }

  console.log(`⚠️  Found ${duplicates.length} emails with multiple accounts:\n`);

  let totalToDelete = 0;

  for (const [email, userList] of duplicates) {
    console.log(`📧 ${email}:`);
    
    // Sort to find primary (prefer non-Google, then oldest)
    userList.sort((a, b) => {
      if (a.isGoogle && !b.isGoogle) return 1;
      if (!a.isGoogle && b.isGoogle) return -1;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    const primary = userList[0];
    const secondaries = userList.slice(1);

    console.log(`   👑 Primary (KEEP): ${primary.username} ${primary.isGoogle ? '(Google)' : '(Email)'}`);
    console.log(`      Status: ${primary.enabled ? 'Enabled' : 'Disabled'}`);
    
    for (const secondary of secondaries) {
      console.log(`\n   🗑️  Secondary (DELETE): ${secondary.username} ${secondary.isGoogle ? '(Google)' : '(Email)'}`);
      console.log(`      Status: ${secondary.enabled ? 'Enabled' : 'Disabled'}`);
      
      if (secondary.enabled) {
        console.log(`      ⚠️  WARNING: This account is still ENABLED!`);
        console.log(`      Please run merge script first to ensure data is migrated.`);
      }

      if (!dryRun) {
        if (secondary.enabled) {
          console.log(`      ❌ SKIPPING - Account is still enabled. Merge first!`);
        } else {
          console.log(`      🗑️  Deleting account...`);
          try {
            await cognitoClient.send(new AdminDeleteUserCommand({
              UserPoolId: USER_POOL_ID,
              Username: secondary.username
            }));
            console.log(`      ✅ Account deleted successfully`);
            totalToDelete++;
          } catch (error) {
            console.error(`      ❌ Error deleting account:`, error.message);
          }
        }
      } else {
        console.log(`      [DRY RUN] Would delete this account`);
        if (!secondary.enabled) {
          totalToDelete++;
        }
      }
    }
    console.log('');
  }

  console.log('='.repeat(60));
  if (dryRun) {
    console.log(`📊 DRY RUN SUMMARY: Would delete ${totalToDelete} secondary accounts`);
    console.log('\n💡 Run with --execute to permanently delete these accounts');
  } else {
    console.log(`✅ DELETED ${totalToDelete} secondary accounts`);
    console.log('\n💡 Refresh the User Management page - duplicate badges should be gone!');
  }
  console.log('='.repeat(60) + '\n');
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
