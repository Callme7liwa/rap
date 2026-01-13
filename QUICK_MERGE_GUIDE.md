# Quick Start: Merge Your Duplicate Accounts

## Your Current Duplicates

Based on your User Management page, you have at least **1 duplicate email**:

```
ayoubseddiki132@gmail.com (2 accounts):
  • 801c392c-10e1-702d-c9ab-a0ea1a86d9a7 (Email/Password)
  • Google_104011317892305698103 (Google OAuth)
```

## Step 1: Preview the Merge (Safe)

```bash
cd backend-api
node scripts/merge-duplicate-accounts.js
```

This will show you:
- Which account will be the primary
- Which accounts will be merged into it
- What data will be migrated
- **NO CHANGES ARE MADE** (dry run mode)

## Step 2: Execute the Merge

Once you've reviewed the dry run:

```bash
node scripts/merge-duplicate-accounts.js --execute
```

This will:
- ✅ Migrate all votes from Google account to Email account
- ✅ Migrate all likes
- ✅ Migrate all follows
- ✅ Migrate all comments
- ✅ Transfer admin privileges (if any)
- ✅ Disable the Google account (can't login anymore)
- ✅ Keep Email/Password account as primary

## Step 3: Verify

1. **Refresh User Management page** - duplicate count should be 0
2. **Login with email/password** - should see all your data
3. **Try Google login** - won't work (account disabled)

## Expected Result

**BEFORE:**
- 2 accounts with same email
- Data split between them
- Confusion about which to use

**AFTER:**
- 1 active account (email/password)
- All data consolidated
- Google account disabled
- Can still login with email/password

## Why Email/Password is Preferred

The script automatically selects `801c392c-10e1-702d-c9ab-a0ea1a86d9a7` as primary because:
1. ✅ It's a native Cognito account (more permanent)
2. ✅ You have the password (can always login)
3. ✅ Google OAuth can have issues (if Google account deleted, you lose access)

## Rollback Option

If something goes wrong, the Google account is only **disabled**, not deleted. An admin can re-enable it:

```javascript
// In AWS Cognito Console or via CLI
aws cognito-idp admin-enable-user \
  --user-pool-id eu-north-1_Nf7KPJdTz \
  --username Google_104011317892305698103
```

## Need Help?

See full documentation: `ACCOUNT_LINKING_SYSTEM.md`

## TL;DR

```bash
# See what will happen (safe)
cd backend-api
node scripts/merge-duplicate-accounts.js

# Looks good? Execute it
node scripts/merge-duplicate-accounts.js --execute

# Done! Refresh User Management page to verify
```

🎯 **Recommended: Run this ASAP to clean up your user accounts!**
