#!/usr/bin/env node

/**
 * Social Features API Test Script
 * 
 * This script tests all the social features endpoints to ensure they're working correctly.
 * Run with: node test-social-api.js
 * 
 * Prerequisites:
 * - Backend server must be running (node server.js)
 * - DynamoDB tables must be created (node scripts/create-social-tables.js)
 * - You must have a valid authentication token
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, symbol, message) {
  console.log(`${color}${symbol}${colors.reset} ${message}`);
}

function success(message) {
  log(colors.green, '✓', message);
}

function error(message) {
  log(colors.red, '✗', message);
}

function info(message) {
  log(colors.blue, 'ℹ', message);
}

function section(message) {
  console.log(`\n${colors.cyan}▶ ${message}${colors.reset}\n`);
}

async function testEndpoint(method, path, options = {}) {
  const url = `${API_BASE}${path}`;
  info(`${method} ${path}`);
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json();
    
    if (response.ok) {
      success(`Status: ${response.status}`);
      if (options.showData) {
        console.log('   Response:', JSON.stringify(data, null, 2));
      }
      return { success: true, data };
    } else {
      error(`Status: ${response.status}`);
      console.log('   Error:', JSON.stringify(data, null, 2));
      return { success: false, error: data };
    }
  } catch (err) {
    error(`Failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function runTests() {
  console.log(`${colors.cyan}
╔══════════════════════════════════════════════╗
║   Social Features API Test Suite            ║
╚══════════════════════════════════════════════╝
${colors.reset}`);

  info(`Testing API at: ${API_BASE}`);
  
  // Test without authentication first (public endpoints)
  section('Public Endpoints (No Auth Required)');
  
  // Test follower count for artist 1
  await testEndpoint('GET', '/api/social/follow/artist/1/count', { showData: true });
  
  // Test like count for song 1
  await testEndpoint('GET', '/api/social/like/song/1/count', { showData: true });
  
  // Test like count for album 1
  await testEndpoint('GET', '/api/social/like/album/1/count', { showData: true });
  
  // Test get comments for song 1
  await testEndpoint('GET', '/api/social/comment/song/1?limit=10', { showData: true });

  // Test with authentication (protected endpoints)
  section('Protected Endpoints (Auth Required)');
  
  info('Note: These will fail without a valid JWT token');
  info('To test authenticated endpoints, add your token to the AUTH_TOKEN variable');
  
  const AUTH_TOKEN = process.env.AUTH_TOKEN || ''; // Add your token here
  
  if (!AUTH_TOKEN) {
    error('No AUTH_TOKEN provided. Skipping authenticated tests.');
    info('Set AUTH_TOKEN environment variable or edit this script to test authenticated endpoints');
  } else {
    const authHeaders = {
      'Authorization': `Bearer ${AUTH_TOKEN}`
    };

    // Test follow artist
    await testEndpoint('POST', '/api/social/follow/artist/1', { 
      headers: authHeaders,
      showData: true 
    });
    
    // Test check following
    await testEndpoint('GET', '/api/social/follow/artist/1/check', {
      headers: authHeaders,
      showData: true
    });
    
    // Test like song
    await testEndpoint('POST', '/api/social/like/song/1', {
      headers: authHeaders,
      showData: true
    });
    
    // Test check liked
    await testEndpoint('GET', '/api/social/like/song/1/check', {
      headers: authHeaders,
      showData: true
    });
    
    // Test add comment
    await testEndpoint('POST', '/api/social/comment/song/1', {
      headers: authHeaders,
      body: { text: 'Test comment from API test script' },
      showData: true
    });
    
    // Test get my followed artists
    await testEndpoint('GET', '/api/social/follow/my-artists', {
      headers: authHeaders,
      showData: true
    });
    
    // Test get my liked content
    await testEndpoint('GET', '/api/social/like/my-content', {
      headers: authHeaders,
      showData: true
    });
    
    // Test get my comments
    await testEndpoint('GET', '/api/social/comment/my-comments', {
      headers: authHeaders,
      showData: true
    });
  }

  // Summary
  section('Test Summary');
  info('Public endpoints tested: 4');
  info('Protected endpoints: 8 (require authentication)');
  info('Total endpoints available: 12');
  
  console.log(`\n${colors.cyan}Documentation:${colors.reset}`);
  console.log('  - Full API docs: SOCIAL_FEATURES.md');
  console.log('  - Integration guide: SOCIAL_FEATURES_INTEGRATION.md');
  console.log('  - Backend routes: backend-api/routes/social.js');
  console.log('  - Frontend components: src/components/');
  
  console.log(`\n${colors.cyan}Next Steps:${colors.reset}`);
  console.log('  1. Ensure backend server is running: cd backend-api && node server.js');
  console.log('  2. Create tables if needed: node scripts/create-social-tables.js');
  console.log('  3. Get auth token from browser (DevTools > Application > Cookies)');
  console.log('  4. Re-run with: AUTH_TOKEN=your_token node test-social-api.js');
}

// Run tests
runTests().catch(err => {
  error(`Fatal error: ${err.message}`);
  process.exit(1);
});
