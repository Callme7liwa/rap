/**
 * Deploy Pre-SignUp Lambda Trigger
 * 
 * This script packages and deploys the Lambda function that prevents
 * duplicate account creation in Cognito.
 */

const { LambdaClient, CreateFunctionCommand, UpdateFunctionCodeCommand, GetFunctionCommand, AddPermissionCommand } = require('@aws-sdk/client-lambda');
const { CognitoIdentityProviderClient, DescribeUserPoolCommand, UpdateUserPoolCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { IAMClient, CreateRoleCommand, AttachRolePolicyCommand, GetRoleCommand } = require('@aws-sdk/client-iam');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');

require('dotenv').config();

const AWS_REGION = process.env.AWS_REGION || 'eu-north-1';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || process.env.USER_POOL_ID;
const LAMBDA_FUNCTION_NAME = 'lyricscape-pre-signup-duplicate-check';
const LAMBDA_ROLE_NAME = 'lyricscape-pre-signup-lambda-role';

const lambdaClient = new LambdaClient({ region: AWS_REGION });
const cognitoClient = new CognitoIdentityProviderClient({ region: AWS_REGION });
const iamClient = new IAMClient({ region: AWS_REGION });

/**
 * Create Lambda execution role if it doesn't exist
 */
async function createLambdaRole() {
  console.log('📋 Creating Lambda execution role...');
  
  try {
    // Check if role exists
    await iamClient.send(new GetRoleCommand({ RoleName: LAMBDA_ROLE_NAME }));
    console.log('   ✅ Role already exists');
    return;
  } catch (error) {
    if (error.name !== 'NoSuchEntity') {
      throw error;
    }
  }

  // Create role
  const assumeRolePolicy = {
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Principal: { Service: 'lambda.amazonaws.com' },
      Action: 'sts:AssumeRole'
    }]
  };

  await iamClient.send(new CreateRoleCommand({
    RoleName: LAMBDA_ROLE_NAME,
    AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicy),
    Description: 'Execution role for Pre-SignUp Lambda trigger'
  }));

  // Attach basic Lambda execution policy
  await iamClient.send(new AttachRolePolicyCommand({
    RoleName: LAMBDA_ROLE_NAME,
    PolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
  }));

  // Attach Cognito read policy
  const cognitoPolicy = {
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Action: [
        'cognito-idp:ListUsers',
        'cognito-idp:AdminGetUser'
      ],
      Resource: `arn:aws:cognito-idp:${AWS_REGION}:*:userpool/${USER_POOL_ID}`
    }]
  };

  await iamClient.send(new AttachRolePolicyCommand({
    RoleName: LAMBDA_ROLE_NAME,
    PolicyArn: 'arn:aws:iam::aws:policy/AmazonCognitoPowerUser'
  }));

  console.log('   ✅ Role created successfully');
  
  // Wait for role to propagate
  console.log('   ⏳ Waiting for role to propagate...');
  await new Promise(resolve => setTimeout(resolve, 10000));
}

/**
 * Package Lambda function
 */
async function packageLambda() {
  console.log('📦 Packaging Lambda function...');
  
  const lambdaDir = path.join(__dirname, '..');
  const outputPath = path.join(lambdaDir, 'pre-signup-trigger.zip');

  // Remove old zip if exists
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log('   ✅ Package created:', archive.pointer(), 'bytes');
      resolve(outputPath);
    });

    archive.on('error', reject);
    archive.pipe(output);

    // Add Lambda function file
    archive.file(path.join(lambdaDir, 'pre-signup-trigger.js'), { name: 'index.js' });
    
    // Add package.json for dependencies
    const packageJson = {
      name: 'pre-signup-trigger',
      version: '1.0.0',
      dependencies: {
        '@aws-sdk/client-cognito-identity-provider': '^3.0.0'
      }
    };
    archive.append(JSON.stringify(packageJson, null, 2), { name: 'package.json' });

    archive.finalize();
  });
}

/**
 * Deploy or update Lambda function
 */
async function deployLambda(zipPath) {
  console.log('🚀 Deploying Lambda function...');
  
  const zipBuffer = fs.readFileSync(zipPath);
  const roleArn = `arn:aws:iam::${process.env.AWS_ACCOUNT_ID}:role/${LAMBDA_ROLE_NAME}`;

  try {
    // Try to get existing function
    await lambdaClient.send(new GetFunctionCommand({
      FunctionName: LAMBDA_FUNCTION_NAME
    }));

    // Function exists, update code
    console.log('   📝 Updating existing function...');
    await lambdaClient.send(new UpdateFunctionCodeCommand({
      FunctionName: LAMBDA_FUNCTION_NAME,
      ZipFile: zipBuffer
    }));
    console.log('   ✅ Function updated');
  } catch (error) {
    if (error.name !== 'ResourceNotFoundException') {
      throw error;
    }

    // Function doesn't exist, create it
    console.log('   ✨ Creating new function...');
    await lambdaClient.send(new CreateFunctionCommand({
      FunctionName: LAMBDA_FUNCTION_NAME,
      Runtime: 'nodejs18.x',
      Role: roleArn,
      Handler: 'index.handler',
      Code: { ZipFile: zipBuffer },
      Description: 'Prevents duplicate account creation by checking existing emails',
      Timeout: 10,
      MemorySize: 256,
      Environment: {
        Variables: {
          COGNITO_USER_POOL_ID: USER_POOL_ID,
          AWS_REGION: AWS_REGION
        }
      }
    }));
    console.log('   ✅ Function created');

    // Add Cognito invoke permission
    console.log('   🔐 Adding Cognito invoke permission...');
    await lambdaClient.send(new AddPermissionCommand({
      FunctionName: LAMBDA_FUNCTION_NAME,
      StatementId: 'AllowCognitoInvoke',
      Action: 'lambda:InvokeFunction',
      Principal: 'cognito-idp.amazonaws.com',
      SourceArn: `arn:aws:cognito-idp:${AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:userpool/${USER_POOL_ID}`
    }));
  }
}

/**
 * Attach Lambda to Cognito User Pool
 */
async function attachTrigger() {
  console.log('🔗 Attaching Lambda trigger to Cognito User Pool...');
  
  const lambdaArn = `arn:aws:lambda:${AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:function:${LAMBDA_FUNCTION_NAME}`;

  // Get current User Pool config
  const poolConfig = await cognitoClient.send(new DescribeUserPoolCommand({
    UserPoolId: USER_POOL_ID
  }));

  // Update with Pre-SignUp trigger
  await cognitoClient.send(new UpdateUserPoolCommand({
    UserPoolId: USER_POOL_ID,
    LambdaConfig: {
      ...poolConfig.UserPool.LambdaConfig,
      PreSignUp: lambdaArn
    }
  }));

  console.log('   ✅ Trigger attached successfully');
}

/**
 * Main deployment function
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔄 DEPLOYING PRE-SIGNUP DUPLICATE CHECK LAMBDA');
  console.log('='.repeat(60) + '\n');

  if (!USER_POOL_ID) {
    console.error('❌ Error: COGNITO_USER_POOL_ID not set in environment');
    process.exit(1);
  }

  if (!process.env.AWS_ACCOUNT_ID) {
    console.error('❌ Error: AWS_ACCOUNT_ID not set in environment');
    console.error('   Run: export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)');
    process.exit(1);
  }

  try {
    // Step 1: Create IAM role
    await createLambdaRole();

    // Step 2: Package Lambda
    const zipPath = await packageLambda();

    // Step 3: Deploy Lambda
    await deployLambda(zipPath);

    // Step 4: Attach to Cognito
    await attachTrigger();

    // Cleanup
    fs.unlinkSync(zipPath);

    console.log('\n' + '='.repeat(60));
    console.log('✅ DEPLOYMENT SUCCESSFUL!');
    console.log('='.repeat(60));
    console.log('\nThe Lambda function is now active and will prevent');
    console.log('duplicate account creation when users sign up.');
    console.log('\nTest it by trying to create a duplicate account!\n');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run deployment
main();
