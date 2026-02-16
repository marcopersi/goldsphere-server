#!/usr/bin/env node

/**
 * Test script to verify endpoint response structures
 * Ensures no double nesting like { success: true, data: { success: true, data: {...} } }
 */

const axios = require('axios');

const API_URL = 'http://localhost:8888';

async function login() {
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'bank.technical@goldsphere.vault',
      password: 'GoldspherePassword'
    });
    
    console.log('✅ Login successful');
    return response.data.token;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function testEndpoint(url, token, expectedStructure) {
  try {
    const response = await axios.get(`${API_URL}${url}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = response.data;
    
    // Check for double nesting
    const hasDoubleNesting = data.success && data.data && data.data.success && data.data.data;
    
    if (hasDoubleNesting) {
      console.log(`❌ ${url} has DOUBLE NESTING!`);
      console.log('Response structure:', JSON.stringify(data, null, 2));
      return false;
    }
    
    // Check if structure matches expected
    const hasExpectedFields = expectedStructure.every(field => data.hasOwnProperty(field));
    
    if (hasExpectedFields) {
      console.log(`✅ ${url} has correct structure: [${expectedStructure.join(', ')}]`);
      return true;
    } else {
      console.log(`⚠️  ${url} structure unexpected. Expected: [${expectedStructure.join(', ')}], Got: [${Object.keys(data).join(', ')}]`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ ${url} failed:`, error.response?.data || error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Testing endpoint response structures...\n');
  
  const token = await login();
  
  const endpoints = [
    { url: '/api/positions', expected: ['positions', 'pagination'] },
    { url: '/api/transactions', expected: ['transactions'] },
    { url: '/api/orders/my', expected: ['orders', 'pagination', 'user'] }
  ];
  
  let allPassed = true;
  
  for (const endpoint of endpoints) {
    const passed = await testEndpoint(endpoint.url, token, endpoint.expected);
    allPassed = allPassed && passed;
  }
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('🎉 All endpoints have correct structure - NO DOUBLE NESTING!');
  } else {
    console.log('❌ Some endpoints still have issues');
    process.exit(1);
  }
}

main().catch(console.error);
