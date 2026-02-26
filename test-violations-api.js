#!/usr/bin/env node

/**
 * Test Script for Violations API
 * 
 * This script tests if violations are being logged correctly to the Next.js API
 * 
 * Usage:
 * 1. Make sure Next.js server is running: npm run dev
 * 2. Run this script: node test-violations-api.js
 */

const API_URL = 'http://localhost:3000/api/violations';

console.log('🧪 Testing Violations API...\n');

// Test 1: POST - Create a test violation
async function testPost() {
  console.log('Test 1: POST - Creating test violation...');
  
  const testViolation = {
    violationType: 'TEST_VIOLATION',
    description: 'This is a test violation from test script',
    studentName: 'Test Student',
    examTitle: 'TEST-SCRIPT Exam',
    severity: 'low',
    timestamp: new Date().toISOString()
  };
  
  console.log('Payload:', JSON.stringify(testViolation, null, 2));
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testViolation)
    });
    
    console.log('Status:', response.status);
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ Test 1 PASSED - Violation created with ID:', data.violationId);
      return data.violationId;
    } else {
      console.log('❌ Test 1 FAILED -', data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ Test 1 FAILED - Error:', error.message);
    return null;
  }
}

// Test 2: GET - Fetch violations
async function testGet() {
  console.log('\nTest 2: GET - Fetching violations...');
  
  try {
    const response = await fetch(API_URL);
    console.log('Status:', response.status);
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.success && Array.isArray(data.violations)) {
      console.log(`✅ Test 2 PASSED - Found ${data.count} violations`);
      
      if (data.count > 0) {
        console.log('\nLatest violation:');
        console.log(JSON.stringify(data.violations[0], null, 2));
      }
      return true;
    } else {
      console.log('❌ Test 2 FAILED - Invalid response');
      return false;
    }
  } catch (error) {
    console.log('❌ Test 2 FAILED - Error:', error.message);
    return false;
  }
}

// Test 3: CORS - Simulate cross-origin request
async function testCORS() {
  console.log('\nTest 3: CORS - Testing preflight request...');
  
  try {
    const response = await fetch(API_URL, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      }
    });
    
    console.log('Status:', response.status);
    console.log('Headers:');
    console.log('  Access-Control-Allow-Origin:', response.headers.get('Access-Control-Allow-Origin'));
    console.log('  Access-Control-Allow-Methods:', response.headers.get('Access-Control-Allow-Methods'));
    console.log('  Access-Control-Allow-Headers:', response.headers.get('Access-Control-Allow-Headers'));
    
    if (response.status === 200 && response.headers.get('Access-Control-Allow-Origin')) {
      console.log('✅ Test 3 PASSED - CORS configured correctly');
      return true;
    } else {
      console.log('❌ Test 3 FAILED - CORS not configured');
      return false;
    }
  } catch (error) {
    console.log('❌ Test 3 FAILED - Error:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('═══════════════════════════════════════════════════');
  console.log('Starting API Tests');
  console.log('API URL:', API_URL);
  console.log('═══════════════════════════════════════════════════\n');
  
  const violationId = await testPost();
  await testGet();
  await testCORS();
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('Test Summary');
  console.log('═══════════════════════════════════════════════════');
  
  if (violationId) {
    console.log('\n✅ All tests passed!');
    console.log('\nNow check:');
    console.log('1. Next.js terminal - should see log messages');
    console.log('2. Teacher dashboard - should show test violation');
    console.log('3. Database - should have new row');
  } else {
    console.log('\n❌ Some tests failed!');
    console.log('\nTroubleshooting:');
    console.log('1. Is Next.js running? (npm run dev)');
    console.log('2. Is database connected? (check .env.local)');
    console.log('3. Does violations table exist?');
    console.log('4. Check Next.js terminal for error messages');
  }
  
  console.log('\n═══════════════════════════════════════════════════\n');
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
