# Account Linking & Duplicate Management System

## Overview
Comprehensive solution for managing duplicate user accounts that occur when users sign up with both email/password and OAuth (Google). The system detects duplicates, provides UI warnings, and includes tools to merge accounts safely.

## Problem Statement

### Current Situation
Users can create accounts through:
1. **Email/Password** → Native Cognito user (UUID username)
2. **Google OAuth** → Federated identity (username: `Google_*`)

**Issue**: Same email can have multiple accounts, causing:
- User confusion (which account to use?)
- Duplicate data (votes, likes, follows split across accounts)
- Admin complexity (which account to promote/manage?)

### Real Example from Your Data
```
ayoubseddiki132@gmail.com has 2 accounts:
  - 801c392c-10e1-702d-c9ab-a0ea1a86d9a7 (Email/Password)
  - Google_104011317892305698103 (Google OAuth)
```

## Solution Architecture

### 1. Detection & Visualization ✅
**UI enhancements showing duplicate accounts:**

#### Duplicate Stats Card
- Shows count of duplicate email groups
- Displays total affected users
- Click to filter only duplicates
- Red warning color for visibility

#### Warning Banner
- Lists all affected emails
- Quick actions: "Show Only Duplicates", "Auto-Merge"
- Summary of issue with clear explanation

#### Table Highlighting
- Duplicate rows have red background tint
- "Duplicate" badge on username
- "2x" badge on email showing account count
- "Google" badge to identify OAuth users

### 2. Merge Script ✅
**Automated data migration tool:**

#### Features
- **Dry Run Mode** (default): Preview changes without executing
- **Single Email Mode**: Merge specific email only
- **Batch Mode**: Merge all duplicates at once
- **Smart Primary Selection**:
  1. Prefer non-Google (email/password) accounts
  2. Fallback to oldest account
  3. Preserve admin privileges

#### Data Migration
Migrates from secondary to primary:
- ✅ Votes (all voting history)
- ✅ Artist follows
- ✅ Content likes (songs + albums)
- ✅ Comments
- ✅ Admin group membership
- ✅ User profile data

#### Safety Features
- Dry run by default (--execute required)
- Detailed logging of all operations
- Account disabling instead of deletion
- Preserves secondary account data temporarily

### 3. Future Enhancements (Planned)
- Automatic linking on login
- User-initiated account linking from profile
- Email verification before merge
- API endpoint for admin-triggered merges
- Rollback capability

## Usage Guide

### Step 1: Detect Duplicates (UI)

Navigate to **User Management** (`/admin/user-management`):

1. Check the **"Duplicate Emails" stat card**
   - Shows count of emails with multiple accounts
   - Red color indicates duplicates exist

2. Review the **warning banner**
   - Lists affected email addresses
   - Shows total impact

3. Click **"Show Only Duplicates"**
   - Filters table to show only affected accounts
   - See highlighted rows with badges

### Step 2: Review Before Merging

**Identify Primary Account:**
- Prefer the account user actively uses
- Consider which has more data
- Check creation dates

**Script automatically prefers:**
1. Email/Password accounts (more permanent)
2. Older accounts (likely user's first)
3. Admin accounts (preserve privileges)

### Step 3: Run Merge Script (Dry Run)

```bash
cd backend-api
node scripts/merge-duplicate-accounts.js
```

**Output:**
```
============================================================
🔄 DUPLICATE ACCOUNT MERGER
============================================================

⚠️  RUNNING IN DRY RUN MODE
   No changes will be made. Use --execute to apply changes.

📥 Fetching all users from Cognito...
✅ Found 6 total users

🔍 Searching for duplicate accounts...
⚠️  Found 1 emails with duplicate accounts

  📧 ayoubseddiki132@gmail.com (2 accounts):
     👑 PRIMARY: 801c392c-10e1-702d-c9ab-a0ea1a86d9a7 (Email) - Created: 1/15/2024
       ➡️  SECONDARY: Google_104011317892305698103 (Google) - Created: 1/20/2024

============================================================
🔄 [DRY RUN] Merging accounts for: ayoubseddiki132@gmail.com
   Primary: 801c392c-10e1-702d-c9ab-a0ea1a86d9a7
   Secondaries: Google_104011317892305698103
============================================================

📦 Processing secondary account: Google_104011317892305698103
  [DRY RUN] Would migrate data and disable account

✅ [DRY RUN] Merge complete for ayoubseddiki132@gmail.com
   📊 Stats: 0 votes, 0 follows, 0 likes, 0 comments

💡 To execute the merge, run:
   node merge-duplicate-accounts.js --execute
```

### Step 4: Execute Merge (Real)

**⚠️ IMPORTANT: Backup First!**

```bash
# Merge all duplicates
node scripts/merge-duplicate-accounts.js --execute

# Or merge specific email only
node scripts/merge-duplicate-accounts.js --execute ayoubseddiki132@gmail.com
```

**What Happens:**
1. ✅ All data migrated to primary account
2. ✅ Secondary account disabled (not deleted)
3. ✅ Admin privileges transferred if needed
4. ✅ Detailed log of all operations

### Step 5: Verify Results

1. **Refresh User Management page**
   - Duplicate count should decrease
   - Warning banner updates/disappears

2. **Check primary account**
   - Login as user
   - Verify all data present (votes, likes, follows)
   - Test functionality

3. **Verify secondary account**
   - Should show "Disabled" status
   - Cannot login
   - Data preserved but inaccessible

## Technical Details

### Primary Account Selection Logic

```javascript
users.sort((a, b) => {
  // 1. Prefer non-Google (email/password) users
  if (a.isGoogle && !b.isGoogle) return 1;
  if (!a.isGoogle && b.isGoogle) return -1;
  
  // 2. Prefer older accounts
  return new Date(a.createdAt) - new Date(b.createdAt);
});

const primary = users[0]; // Selected primary
```

### Data Migration Process

#### Votes Migration
```javascript
// Update user_id in votes table
UPDATE lyricscape-votes-prod
SET user_id = primarySub
WHERE user_id = secondarySub
```

#### Follows Migration
```javascript
// Delete old follow with secondary user
DELETE FROM artist-follows-prod
WHERE pk = 'FOLLOW#secondarySub' AND sk = 'ARTIST#artistId'

// Create new follow with primary user
PUT INTO artist-follows-prod
{
  pk: 'FOLLOW#primarySub',
  sk: 'ARTIST#artistId',
  user_id: primarySub,
  // ... other fields
}
```

#### Likes Migration
```javascript
// Similar pattern: delete old, create new with primary user
// Ensures GSI indexes update correctly
```

#### Comments Migration
```javascript
// Update user_id in comments
UPDATE content-comments-prod
SET user_id = primarySub
WHERE user_id = secondarySub
```

### Account Disabling vs Deletion

**Disabled (Current Approach):**
- ✅ User cannot login
- ✅ Data preserved
- ✅ Can be re-enabled if needed
- ✅ Audit trail maintained

**Deletion (Not Recommended):**
- ❌ Permanent action
- ❌ Loses audit trail
- ❌ Cannot rollback
- ❌ Cognito sub references break

## UI Components

### AdminUserManagement.tsx Enhancements

#### New State
```typescript
const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
```

#### Duplicate Detection Logic
```typescript
const emailMap = new Map<string, CognitoUser[]>();
users.forEach(user => {
  if (user.email) {
    const existing = emailMap.get(user.email) || [];
    existing.push(user);
    emailMap.set(user.email, existing);
  }
});

const duplicateEmails = Array.from(emailMap.entries())
  .filter(([_, users]) => users.length > 1)
  .map(([email, users]) => ({
    email,
    users,
    count: users.length
  }));
```

#### Table Row Highlighting
```typescript
const isDuplicate = duplicateUsernames.has(user.username);
const isGoogleUser = user.username.startsWith('Google_');

<TableRow className={isDuplicate ? 'bg-destructive/5' : ''}>
  <TableCell>
    {user.username}
    {isGoogleUser && <Badge>Google</Badge>}
    {isDuplicate && <Badge variant="destructive">Duplicate</Badge>}
  </TableCell>
</TableRow>
```

## Script Commands

### Dry Run (Safe Preview)
```bash
# Check all duplicates
node scripts/merge-duplicate-accounts.js

# Check specific email
node scripts/merge-duplicate-accounts.js ayoubseddiki132@gmail.com
```

### Execute Merge
```bash
# Merge all duplicates
node scripts/merge-duplicate-accounts.js --execute

# Merge specific email
node scripts/merge-duplicate-accounts.js --execute ayoubseddiki132@gmail.com
```

### Expected Output
```
============================================================
📊 TOTAL STATS
============================================================
   Votes migrated: 15
   Follows migrated: 8
   Likes migrated: 23
   Comments migrated: 4
============================================================
```

## Testing Procedures

### Test Scenario 1: Visual Detection
1. Create 2 accounts with same email (one email/password, one Google)
2. Navigate to User Management page
3. **Verify:**
   - Duplicate count shows "1"
   - Warning banner appears
   - Both accounts highlighted in table
   - Correct badges displayed

### Test Scenario 2: Data Migration (Dry Run)
1. Add votes/likes/follows to both duplicate accounts
2. Run: `node scripts/merge-duplicate-accounts.js`
3. **Verify:**
   - Script identifies duplicates correctly
   - Primary account selected logically
   - Stats preview shows data to migrate
   - No actual changes made

### Test Scenario 3: Real Merge
1. Backup DynamoDB tables
2. Run: `node scripts/merge-duplicate-accounts.js --execute`
3. **Verify:**
   - All data migrated to primary
   - Secondary account disabled
   - Primary account has combined data
   - User can login with primary only
   - All features work (voting, likes, follows)

### Test Scenario 4: Admin Privilege Transfer
1. Make secondary account admin
2. Run merge script
3. **Verify:**
   - Primary account becomes admin
   - Secondary account loses admin
   - Admin features work on primary

## Troubleshooting

### Issue: Script shows no duplicates but UI shows them
**Solution:** 
- Check if users have different emails
- Verify Cognito email attributes are set
- Check for typos in emails

### Issue: Data migration fails partway
**Solution:**
- Check DynamoDB table names in script
- Verify AWS credentials have write permissions
- Review CloudWatch logs for specific errors
- Re-run script (it's idempotent for most operations)

### Issue: User can't login after merge
**Solution:**
- Verify primary account is enabled
- Check Cognito user status
- Ensure correct identity provider configured
- Test with password reset

### Issue: Admin privileges not transferred
**Solution:**
- Manually add primary user to admin group:
```bash
node scripts/add-user-to-admin.js primaryUsername
```

## Best Practices

### Before Merging
1. ✅ Run dry run first
2. ✅ Backup DynamoDB tables
3. ✅ Notify affected users
4. ✅ Document which accounts are primary
5. ✅ Test on dev environment first

### During Merge
1. ✅ Monitor script output
2. ✅ Check for errors
3. ✅ Verify data migration counts
4. ✅ Note any warnings

### After Merge
1. ✅ Verify in User Management UI
2. ✅ Test user login
3. ✅ Confirm data integrity
4. ✅ Keep disabled accounts for 30 days
5. ✅ Document the merge

## Future Improvements

### Automatic Linking (Phase 2)
When user signs in with Google and email already exists:
```
┌─────────────────────────────────────┐
│  Link Your Accounts?                │
│                                     │
│  You already have an account with   │
│  this email. Link your Google       │
│  account to access it?              │
│                                     │
│  [Cancel]  [Link Accounts]          │
└─────────────────────────────────────┘
```

### User Profile Linking (Phase 3)
Allow users to link/unlink providers:
```
Settings → Connected Accounts
  ✓ Email/Password
  ✓ Google (linked 2024-01-20)
  [ Add Facebook ]
```

### API Endpoint (Phase 4)
```
POST /api/admin/users/merge
Body: {
  primaryUsername: "801c392c-...",
  secondaryUsernames: ["Google_104011..."]
}
```

### Rollback Capability (Phase 5)
```bash
node scripts/rollback-merge.js ayoubseddiki132@gmail.com
```

## Security Considerations

1. **Admin Only**: Merge operations require admin privileges
2. **Audit Logging**: All merges logged to CloudWatch
3. **Data Integrity**: Atomic operations where possible
4. **Reversibility**: Disabled accounts can be re-enabled
5. **Verification**: Dry run prevents accidental merges

## Summary

### Current Status ✅
- ✅ UI detection and visualization
- ✅ Duplicate highlighting in table
- ✅ Warning banners and stats
- ✅ Comprehensive merge script
- ✅ Dry run safety mode
- ✅ Data migration (votes, likes, follows, comments)
- ✅ Admin privilege transfer
- ✅ Account disabling
- ✅ Detailed documentation

### Immediate Next Steps
1. Run dry run to review duplicates
2. Verify merge logic is correct
3. Execute merge on production
4. Monitor results
5. Plan Phase 2 (automatic linking)

### Impact
- 🎯 Eliminates user confusion
- 🎯 Consolidates user data
- 🎯 Simplifies admin management
- 🎯 Improves data consistency
- 🎯 Better user experience

**Your duplicate accounts can now be safely merged! 🎉**
