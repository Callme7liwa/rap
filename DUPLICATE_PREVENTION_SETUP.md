# Prevent Duplicate Account Creation

## Problem
Users can create multiple accounts with the same email using different methods:
- Email/Password signup
- Google OAuth
- Facebook OAuth

This causes confusion and data fragmentation.

## Solution: Pre-SignUp Lambda Trigger

Add a Lambda function to Cognito that checks if an email already exists before allowing signup.

## Manual Setup (Recommended)

### Step 1: Create Lambda Function

1. **Go to AWS Lambda Console**
   - Navigate to: https://console.aws.amazon.com/lambda
   - Click "Create function"

2. **Configure Function**
   - Function name: `lyricscape-pre-signup-duplicate-check`
   - Runtime: `Node.js 18.x`
   - Architecture: `x86_64`
   - Permissions: Create new role with basic Lambda permissions

3. **Add Code**
   - Copy contents of `lambda/pre-signup-trigger.js`
   - Paste into Lambda code editor
   - Click "Deploy"

4. **Set Environment Variables**
   ```
   COGNITO_USER_POOL_ID = eu-north-1_Nf7KPJdTz
   AWS_REGION = eu-north-1
   ```

5. **Configure Permissions**
   - Go to "Configuration" → "Permissions"
   - Click on the execution role
   - Attach policy: `AmazonCognitoReadOnly`
   - Or create inline policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": [
         "cognito-idp:ListUsers",
         "cognito-idp:AdminGetUser"
       ],
       "Resource": "arn:aws:cognito-idp:eu-north-1:*:userpool/eu-north-1_Nf7KPJdTz"
     }]
   }
   ```

### Step 2: Attach to Cognito User Pool

1. **Go to Cognito Console**
   - Navigate to: https://console.aws.amazon.com/cognito
   - Select User Pool: `lyricscape-users-prod`

2. **Add Lambda Trigger**
   - Go to "User pool properties" tab
   - Scroll to "Lambda triggers"
   - Click "Add Lambda trigger"
   - Trigger type: **Pre sign-up**
   - Select Lambda function: `lyricscape-pre-signup-duplicate-check`
   - Click "Save changes"

### Step 3: Test

1. **Try to create duplicate account**
   - Go to your app's signup page
   - Try to sign up with email that already exists
   - Should see error: "An account with this email already exists"

2. **Try OAuth with existing email**
   - Click "Sign in with Google"
   - Use Google account with email that already exists
   - Should see error: "An account with email xxx already exists"

## Error Messages

The Lambda will show different messages based on signup method:

### Email/Password Signup
```
An account with this email already exists. 
Please sign in or use password recovery.
```

### OAuth Signup (Google/Facebook)
```
An account with email xxx@example.com already exists. 
Please sign in with your existing account instead of creating a new one.
```

## How It Works

```
User clicks "Sign Up"
         ↓
Cognito receives signup request
         ↓
[PRE-SIGNUP TRIGGER]
Lambda checks if email exists
         ↓
    Email exists?
    ↙          ↘
  YES          NO
   ↓            ↓
Throw error   Allow signup
   ↓            ↓
User sees     Account created
error message
```

## Testing Scenarios

### Test 1: Duplicate Email/Password
```bash
# Existing: ayoubseddiki132@gmail.com (email/password)
# Try: Sign up with ayoubseddiki132@gmail.com (email/password)
# Expected: Error message, no account created
```

### Test 2: Duplicate OAuth
```bash
# Existing: user@gmail.com (email/password)
# Try: Sign in with Google (user@gmail.com)
# Expected: Error message, no account created
```

### Test 3: New Email (Should Work)
```bash
# Try: Sign up with newemail@example.com
# Expected: Account created successfully
```

## Automated Deployment (Alternative)

If you want to automate the deployment:

```bash
# Set AWS Account ID
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Run deployment script
cd lambda
node deploy-pre-signup-trigger.js
```

## Rollback

To disable duplicate checking:

1. Go to Cognito Console
2. Select User Pool
3. Go to "Lambda triggers"
4. Find "Pre sign-up" trigger
5. Click "Remove trigger"

## Current Status

✅ Lambda function code created: `lambda/pre-signup-trigger.js`
✅ Deployment script created: `lambda/deploy-pre-signup-trigger.js`
⚠️ **Manual setup required** - Follow steps above

## Benefits After Implementation

✅ **No More Duplicates**: Users can't create multiple accounts with same email
✅ **Clear Error Messages**: Users know why signup failed
✅ **Automatic**: Works for all signup methods (email, Google, Facebook)
✅ **Consistent**: Same email = one account rule enforced

## Next Steps

1. **Set up Lambda function** (10 minutes)
2. **Attach to Cognito** (2 minutes)
3. **Test with existing email** (1 minute)
4. **Celebrate!** 🎉

Once this is set up, combined with the merge script you already ran, you'll have:
- ✅ Existing duplicates merged
- ✅ Future duplicates prevented

**No more duplicate account headaches!**
