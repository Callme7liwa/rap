/**
 * Test Admin User Management Endpoints
 * 
 * This script tests the admin user management endpoints to ensure they're working correctly.
 * You need to provide a valid admin JWT token to run these tests.
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

// You need to replace this with a valid admin JWT token from your browser
// 1. Open browser DevTools
// 2. Go to Application > Local Storage
// 3. Find the Cognito token
// Or run: await fetchAuthSession() in browser console
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'YOUR_TOKEN_HERE';

async function testGetUsers() {
  console.log('\n🔍 Testing GET /api/admin/users...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
      },
    });

    console.log('Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error:', error);
      return;
    }

    const data = await response.json();
    console.log('✅ Success!');
    console.log('Total Users:', data.total);
    console.log('Admin Users:', data.admins);
    console.log('Regular Users:', data.regularUsers);
    console.log('\nFirst 5 users:');
    data.users.slice(0, 5).forEach(user => {
      console.log(`  - ${user.username} (${user.email || 'no email'}) - ${user.groups.join(', ') || 'no groups'}`);
    });
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

async function testAddUserToAdmin(username) {
  console.log(`\n➕ Testing POST /api/admin/users/${username}/add-to-admin...\n`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/users/${username}/add-to-admin`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Status:', response.status, response.statusText);
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error:', data);
      return;
    }

    console.log('✅ Success:', data.message);
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

async function testRemoveUserFromAdmin(username) {
  console.log(`\n➖ Testing POST /api/admin/users/${username}/remove-from-admin...\n`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/users/${username}/remove-from-admin`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Status:', response.status, response.statusText);
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error:', data);
      return;
    }

    console.log('✅ Success:', data.message);
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

async function testEnvironmentConfig() {
  console.log('\n⚙️  Checking Environment Configuration...\n');
  
  const requiredVars = [
    'COGNITO_USER_POOL_ID',
    'COGNITO_CLIENT_ID',
    'AWS_REGION',
    'USER_POOL_ID',
  ];

  console.log('Environment Variables:');
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`  ✅ ${varName}: ${value.substring(0, 20)}...`);
    } else {
      console.log(`  ❌ ${varName}: NOT SET`);
    }
  });

  console.log('\nCognito User Pool ID:', process.env.COGNITO_USER_POOL_ID || process.env.USER_POOL_ID || '❌ NOT SET');
  console.log('AWS Region:', process.env.AWS_REGION || '❌ NOT SET');
}

async function main() {
  console.log('='.repeat(60));
  console.log('🧪 Admin User Management API Tests');
  console.log('='.repeat(60));

  // Check environment
  await testEnvironmentConfig();

  // Check if token is provided
  if (ADMIN_TOKEN === 'YOUR_TOKEN_HERE') {
    console.log('\n❌ ERROR: Please provide a valid admin token!');
    console.log('\nTo get your token:');
    console.log('1. Login as admin in the browser');
    console.log('2. Open DevTools Console');
    console.log('3. Run: await fetchAuthSession()');
    console.log('4. Copy the idToken value');
    console.log('5. Set ADMIN_TOKEN environment variable or edit this file');
    console.log('\nExample:');
    console.log('  ADMIN_TOKEN="your-token-here" node test-admin-users.js');
    return;
  }

  // Test get users
  await testGetUsers();

  // Uncomment to test adding/removing admin (replace USERNAME)
  // await testAddUserToAdmin('USERNAME');
  // await testRemoveUserFromAdmin('USERNAME');

  console.log('\n' + '='.repeat(60));
  console.log('✅ Tests completed!');
  console.log('='.repeat(60) + '\n');
}

// Run tests
main().catch(console.error);
