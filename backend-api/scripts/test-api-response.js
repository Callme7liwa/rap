/**
 * Test Admin API Response
 * Direct test of what the /api/admin/users endpoint returns
 */

const fetch = require('node-fetch');
require('dotenv').config();

async function main() {
  // You'll need to get a real JWT token from your browser
  console.log('\n⚠️  To test this, you need to:');
  console.log('1. Open browser DevTools (F12)');
  console.log('2. Go to Application > Local Storage or Session Storage');
  console.log('3. Find your JWT token');
  console.log('4. Or use the console: copy(localStorage.getItem("token"))');
  console.log('\nThen run: TOKEN="your-jwt-token" node scripts/test-api-response.js\n');
  
  const token = process.env.TOKEN;
  
  if (!token) {
    console.log('❌ No TOKEN environment variable set');
    process.exit(1);
  }

  const apiUrl = process.env.VITE_API_ENDPOINT || 'http://localhost:3000/api';
  
  console.log(`📡 Fetching from: ${apiUrl}/admin/users\n`);
  
  const response = await fetch(`${apiUrl}/admin/users`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    console.error('❌ API Error:', response.status, response.statusText);
    const text = await response.text();
    console.error('Response:', text);
    process.exit(1);
  }

  const data = await response.json();
  
  console.log('✅ API Response:');
  console.log(JSON.stringify(data, null, 2));
  
  console.log('\n📊 Summary:');
  console.log(`Total: ${data.total || data.users?.length || 0}`);
  console.log(`Admins: ${data.admins || 'not provided'}`);
  console.log(`Regular: ${data.regularUsers || 'not provided'}`);
  
  if (data.users) {
    console.log('\n👥 Users:');
    data.users.forEach(u => {
      console.log(`  ${u.username}`);
      console.log(`    Enabled: ${u.enabled}`);
      console.log(`    Groups: [${u.groups?.join(', ') || 'none'}]`);
      console.log(`    Email: ${u.email || 'N/A'}`);
    });
  }
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
