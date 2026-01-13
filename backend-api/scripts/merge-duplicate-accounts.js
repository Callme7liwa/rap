/**
 * Merge Duplicate User Accounts Script
 * 
 * This script merges data from duplicate Cognito accounts (same email, different providers)
 * into a single primary account. It:
 * 1. Identifies duplicate accounts by email
 * 2. Selects a primary account (prefer non-Google, or oldest)
 * 3. Migrates all data (votes, likes, follows, comments) to primary account
 * 4. Optionally disables or deletes secondary accounts
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { CognitoIdentityProviderClient, ListUsersCommand, AdminListGroupsForUserCommand, AdminDisableUserCommand, AdminEnableUserCommand, AdminDeleteUserCommand, AdminAddUserToGroupCommand } = require('@aws-sdk/client-cognito-identity-provider');
require('dotenv').config();

const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' })
);

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'eu-north-1'
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || process.env.USER_POOL_ID;

// DynamoDB Tables
const VOTES_TABLE = 'lyricscape-votes-prod';
const ARTIST_FOLLOWS_TABLE = 'artist-follows-prod';
const CONTENT_LIKES_TABLE = 'content-likes-prod';
const CONTENT_COMMENTS_TABLE = 'content-comments-prod';

/**
 * Get all users from Cognito
 */
async function getAllUsers() {
  console.log('📥 Fetching all users from Cognito...');
  
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
        sub: user.Attributes?.find(attr => attr.Name === 'sub')?.Value,
        email: emailAttr?.Value,
        enabled: user.Enabled,
        userStatus: user.UserStatus,
        groups: groups,
        createdAt: user.UserCreateDate,
        isGoogle: user.Username.startsWith('Google_')
      };
    })
  );

  console.log(`✅ Found ${users.length} total users\n`);
  return users;
}

/**
 * Find duplicate accounts (same email, multiple users)
 */
function findDuplicates(users) {
  console.log('🔍 Searching for duplicate accounts...');
  
  const emailMap = new Map();
  
  users.forEach(user => {
    if (user.email) {
      const existing = emailMap.get(user.email) || [];
      existing.push(user);
      emailMap.set(user.email, existing);
    }
  });

  const duplicates = Array.from(emailMap.entries())
    .filter(([_, users]) => users.length > 1)
    .map(([email, users]) => ({
      email,
      users: users.sort((a, b) => {
        // Prefer non-Google users
        if (a.isGoogle && !b.isGoogle) return 1;
        if (!a.isGoogle && b.isGoogle) return -1;
        // Then prefer older accounts
        return new Date(a.createdAt) - new Date(b.createdAt);
      })
    }));

  console.log(`⚠️  Found ${duplicates.length} emails with duplicate accounts\n`);
  
  duplicates.forEach(dup => {
    console.log(`  📧 ${dup.email} (${dup.users.length} accounts):`);
    dup.users.forEach((user, i) => {
      console.log(`     ${i === 0 ? '👑 PRIMARY' : '  ➡️  SECONDARY'}: ${user.username} ${user.isGoogle ? '(Google)' : '(Email)'} - Created: ${user.createdAt?.toLocaleDateString()}`);
    });
    console.log('');
  });

  return duplicates;
}

/**
 * Migrate votes from secondary to primary account
 */
async function migrateVotes(secondarySub, primarySub) {
  console.log('  📊 Migrating votes...');
  
  try {
    // Scan for votes by secondary user
    const result = await dynamoClient.send(new ScanCommand({
      TableName: VOTES_TABLE,
      FilterExpression: 'user_id = :userId',
      ExpressionAttributeValues: {
        ':userId': { S: secondarySub }
      }
    }));

    const votes = result.Items || [];
    console.log(`     Found ${votes.length} votes`);

    // Update each vote to primary user
    for (const vote of votes) {
      await dynamoClient.send(new UpdateCommand({
        TableName: VOTES_TABLE,
        Key: {
          id: vote.id.S,
          timestamp: vote.timestamp.S
        },
        UpdateExpression: 'SET user_id = :primaryId',
        ExpressionAttributeValues: {
          ':primaryId': primarySub
        }
      }));
    }

    console.log(`     ✅ Migrated ${votes.length} votes`);
    return votes.length;
  } catch (error) {
    console.error('     ❌ Error migrating votes:', error.message);
    return 0;
  }
}

/**
 * Migrate follows from secondary to primary account
 */
async function migrateFollows(secondarySub, primarySub) {
  console.log('  👥 Migrating follows...');
  
  try {
    const result = await dynamoClient.send(new QueryCommand({
      TableName: ARTIST_FOLLOWS_TABLE,
      IndexName: 'UserFollowsIndex',
      KeyConditionExpression: 'user_id = :userId',
      ExpressionAttributeValues: {
        ':userId': secondarySub
      }
    }));

    const follows = result.Items || [];
    console.log(`     Found ${follows.length} follows`);

    for (const follow of follows) {
      // Delete old follow
      await dynamoClient.send(new DeleteCommand({
        TableName: ARTIST_FOLLOWS_TABLE,
        Key: {
          pk: follow.pk,
          sk: follow.sk
        }
      }));

      // Create new follow with primary user
      await dynamoClient.send(new PutCommand({
        TableName: ARTIST_FOLLOWS_TABLE,
        Item: {
          pk: `FOLLOW#${primarySub}`,
          sk: follow.sk,
          user_id: primarySub,
          artist_id: follow.artist_id,
          followed_at: follow.followed_at
        }
      }));
    }

    console.log(`     ✅ Migrated ${follows.length} follows`);
    return follows.length;
  } catch (error) {
    console.error('     ❌ Error migrating follows:', error.message);
    return 0;
  }
}

/**
 * Migrate likes from secondary to primary account
 */
async function migrateLikes(secondarySub, primarySub) {
  console.log('  ❤️  Migrating likes...');
  
  try {
    const result = await dynamoClient.send(new QueryCommand({
      TableName: CONTENT_LIKES_TABLE,
      IndexName: 'UserLikesIndex',
      KeyConditionExpression: 'user_id = :userId',
      ExpressionAttributeValues: {
        ':userId': secondarySub
      }
    }));

    const likes = result.Items || [];
    console.log(`     Found ${likes.length} likes`);

    for (const like of likes) {
      // Delete old like
      await dynamoClient.send(new DeleteCommand({
        TableName: CONTENT_LIKES_TABLE,
        Key: {
          pk: like.pk,
          sk: like.sk
        }
      }));

      // Create new like with primary user
      await dynamoClient.send(new PutCommand({
        TableName: CONTENT_LIKES_TABLE,
        Item: {
          pk: `LIKE#${primarySub}#${like.content_type}`,
          sk: like.sk,
          user_id: primarySub,
          content_id: like.content_id,
          content_type: like.content_type,
          liked_at: like.liked_at
        }
      }));
    }

    console.log(`     ✅ Migrated ${likes.length} likes`);
    return likes.length;
  } catch (error) {
    console.error('     ❌ Error migrating likes:', error.message);
    return 0;
  }
}

/**
 * Migrate comments from secondary to primary account
 */
async function migrateComments(secondarySub, primarySub) {
  console.log('  💬 Migrating comments...');
  
  try {
    const result = await dynamoClient.send(new QueryCommand({
      TableName: CONTENT_COMMENTS_TABLE,
      IndexName: 'UserCommentsIndex',
      KeyConditionExpression: 'user_id = :userId',
      ExpressionAttributeValues: {
        ':userId': secondarySub
      }
    }));

    const comments = result.Items || [];
    console.log(`     Found ${comments.length} comments`);

    for (const comment of comments) {
      await dynamoClient.send(new UpdateCommand({
        TableName: CONTENT_COMMENTS_TABLE,
        Key: {
          pk: comment.pk,
          sk: comment.sk
        },
        UpdateExpression: 'SET user_id = :primaryId',
        ExpressionAttributeValues: {
          ':primaryId': primarySub
        }
      }));
    }

    console.log(`     ✅ Migrated ${comments.length} comments`);
    return comments.length;
  } catch (error) {
    console.error('     ❌ Error migrating comments:', error.message);
    return 0;
  }
}

/**
 * Enable primary account (ensure it's active)
 */
async function enablePrimaryAccount(username) {
  console.log(`  🔓 Ensuring primary account is enabled: ${username}`);
  
  try {
    await cognitoClient.send(new AdminEnableUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username
    }));
    console.log(`     ✅ Primary account enabled`);
  } catch (error) {
    console.error(`     ❌ Error enabling account:`, error.message);
  }
}

/**
 * Disable secondary account
 */
async function disableSecondaryAccount(username) {
  console.log(`  🔒 Disabling secondary account: ${username}`);
  
  try {
    await cognitoClient.send(new AdminDisableUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username
    }));
    console.log(`     ✅ Account disabled`);
  } catch (error) {
    console.error(`     ❌ Error disabling account:`, error.message);
  }
}

/**
 * Merge duplicate accounts for a single email
 */
async function mergeDuplicateEmail(duplicateGroup, dryRun = true) {
  const { email, users } = duplicateGroup;
  const primary = users[0];
  const secondaries = users.slice(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 ${dryRun ? '[DRY RUN] ' : ''}Merging accounts for: ${email}`);
  console.log(`   Primary: ${primary.username} (${primary.sub})`);
  console.log(`   Secondaries: ${secondaries.map(u => u.username).join(', ')}`);
  console.log(`${'='.repeat(60)}\n`);

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  const stats = {
    votes: 0,
    follows: 0,
    likes: 0,
    comments: 0
  };

  // Enable primary account first to ensure it's active
  if (!dryRun) {
    await enablePrimaryAccount(primary.username);
  }

  for (const secondary of secondaries) {
    console.log(`\n📦 Processing secondary account: ${secondary.username}`);

    if (!dryRun) {
      stats.votes += await migrateVotes(secondary.sub, primary.sub);
      stats.follows += await migrateFollows(secondary.sub, primary.sub);
      stats.likes += await migrateLikes(secondary.sub, primary.sub);
      stats.comments += await migrateComments(secondary.sub, primary.sub);
      
      // Migrate admin status if secondary was admin
      if (secondary.groups.includes('admin') && !primary.groups.includes('admin')) {
        console.log(`  👑 Transferring admin privileges...`);
        await cognitoClient.send(new AdminAddUserToGroupCommand({
          UserPoolId: USER_POOL_ID,
          Username: primary.username,
          GroupName: 'admin'
        }));
        console.log(`     ✅ Admin privileges transferred`);
      }

      await disableSecondaryAccount(secondary.username);
    } else {
      console.log('  [DRY RUN] Would migrate data and disable account');
    }
  }

  console.log(`\n✅ ${dryRun ? '[DRY RUN] ' : ''}Merge complete for ${email}`);
  console.log(`   📊 Stats: ${stats.votes} votes, ${stats.follows} follows, ${stats.likes} likes, ${stats.comments} comments\n`);

  return stats;
}

/**
 * Main function
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔄 DUPLICATE ACCOUNT MERGER');
  console.log('='.repeat(60) + '\n');

  // Get command line arguments
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');
  const email = args.find(arg => arg.includes('@'));

  if (dryRun) {
    console.log('⚠️  RUNNING IN DRY RUN MODE');
    console.log('   No changes will be made. Use --execute to apply changes.\n');
  } else {
    console.log('⚠️  EXECUTING REAL MERGE');
    console.log('   This will modify data! Make sure you have backups.\n');
  }

  // Fetch users and find duplicates
  const users = await getAllUsers();
  const duplicates = findDuplicates(users);

  if (duplicates.length === 0) {
    console.log('✅ No duplicate accounts found!\n');
    return;
  }

  // If specific email provided, merge only that one
  if (email) {
    const target = duplicates.find(d => d.email === email);
    if (!target) {
      console.log(`❌ No duplicate accounts found for email: ${email}\n`);
      return;
    }
    await mergeDuplicateEmail(target, dryRun);
  } else {
    // Merge all duplicates
    console.log(`\n🔄 Merging ${duplicates.length} duplicate email groups...\n`);
    
    const totalStats = {
      votes: 0,
      follows: 0,
      likes: 0,
      comments: 0
    };

    for (const duplicate of duplicates) {
      const stats = await mergeDuplicateEmail(duplicate, dryRun);
      totalStats.votes += stats.votes;
      totalStats.follows += stats.follows;
      totalStats.likes += stats.likes;
      totalStats.comments += stats.comments;
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 TOTAL STATS');
    console.log('='.repeat(60));
    console.log(`   Votes migrated: ${totalStats.votes}`);
    console.log(`   Follows migrated: ${totalStats.follows}`);
    console.log(`   Likes migrated: ${totalStats.likes}`);
    console.log(`   Comments migrated: ${totalStats.comments}`);
    console.log('='.repeat(60) + '\n');
  }

  if (dryRun) {
    console.log('\n💡 To execute the merge, run:');
    console.log('   node merge-duplicate-accounts.js --execute\n');
    console.log('   Or for a specific email:');
    console.log('   node merge-duplicate-accounts.js --execute email@example.com\n');
  } else {
    console.log('\n✅ Merge completed successfully!\n');
  }
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
