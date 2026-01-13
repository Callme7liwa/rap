/**
 * Cognito Pre-SignUp Lambda Trigger
 * 
 * This Lambda function prevents duplicate account creation by checking
 * if an email already exists in the User Pool (across different identity providers).
 * 
 * Deploy this as a Lambda function and attach it to your Cognito User Pool's
 * Pre-SignUp trigger.
 */

const { CognitoIdentityProviderClient, ListUsersCommand } = require('@aws-sdk/client-cognito-identity-provider');

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'eu-north-1'
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

/**
 * Check if email already exists in User Pool
 */
async function emailExists(email) {
  try {
    const response = await cognitoClient.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter: `email = "${email}"`,
      Limit: 1
    }));

    return (response.Users && response.Users.length > 0);
  } catch (error) {
    console.error('Error checking email:', error);
    return false;
  }
}

/**
 * Main handler for Pre-SignUp trigger
 */
exports.handler = async (event) => {
  console.log('Pre-SignUp Event:', JSON.stringify(event, null, 2));

  const { email } = event.request.userAttributes;
  const triggerSource = event.triggerSource;
  
  // Skip validation for external providers (they're already validated)
  // But check for duplicates
  const isDuplicate = await emailExists(email);
  
  if (isDuplicate) {
    // Check what type of signup this is
    const isExternalProvider = triggerSource.includes('ExternalProvider');
    const provider = event.userName.split('_')[0]; // Google, Facebook, etc.
    
    if (isExternalProvider) {
      // OAuth signup with existing email
      throw new Error(
        `An account with email ${email} already exists. Please sign in with your existing account instead of creating a new one.`
      );
    } else {
      // Email/password signup with existing email
      throw new Error(
        `An account with this email already exists. Please sign in or use password recovery.`
      );
    }
  }

  // If we get here, email is unique - allow signup
  console.log('Email is unique, allowing signup');
  
  // Auto-confirm users who sign up with external providers
  if (triggerSource === 'PreSignUp_ExternalProvider') {
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
  }

  return event;
};
