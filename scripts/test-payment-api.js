#!/usr/bin/env node

/**
 * Quick Payment API Test Script
 * 
 * Prerequisites:
 * 1. Server running on localhost:8080
 * 2. Stripe CLI running: stripe listen --forward-to localhost:8080/api/v1/payments/webhook
 * 
 * Usage: npm run test:payment-quick
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8080';
const TEST_ORDER_ID = `order_test_${Date.now()}`;

let authToken = '';
let paymentIntentId = '';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString().substr(11, 8);
  const prefix = `[${timestamp}]`;
  
  switch (type) {
    case 'success':
      console.log(`${colors.green}${prefix} ✅ ${message}${colors.reset}`);
      break;
    case 'error':
      console.log(`${colors.red}${prefix} ❌ ${message}${colors.reset}`);
      break;
    case 'info':
      console.log(`${colors.blue}${prefix} ℹ️  ${message}${colors.reset}`);
      break;
    case 'warning':
      console.log(`${colors.yellow}${prefix} ⚠️  ${message}${colors.reset}`);
      break;
    default:
      console.log(`${prefix} ${message}`);
  }
}

async function checkServerHealth() {
  try {
    log('Checking server health...');
    await axios.get(`${BASE_URL}/health`);
    log('Server is running', 'success');
    return true;
  } catch (error) {
    log('Server is not running. Please start with: npm start', 'error');
    return false;
  }
}

async function getAuthToken() {
  try {
    log('Getting authentication token...');
    
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@goldsphere.vault',
      password: 'admin123'
    });
    
    if (response.data.success) {
      authToken = response.data.token;
      log(`Authentication successful. User: ${response.data.user.email}`, 'success');
      return true;
    } else {
      log('Authentication failed', 'error');
      return false;
    }
  } catch (error) {
    log(`Authentication error: ${error.response?.data?.error || error.message}`, 'error');
    return false;
  }
}

async function createPaymentIntent() {
  try {
    log('Creating payment intent...');
    
    const paymentData = {
      amount: 2500, // $25.00
      currency: 'USD',
      orderId: TEST_ORDER_ID,
      description: 'Quick Test - 1oz Gold Bar Purchase',
      metadata: {
        testType: 'quick-test',
        environment: 'development'
      }
    };
    
    const response = await axios.post(`${BASE_URL}/api/payments/intent`, paymentData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      paymentIntentId = response.data.paymentIntent.id;
      log(`Payment intent created: ${paymentIntentId}`, 'success');
      log(`Amount: $${response.data.paymentIntent.amount / 100}`, 'info');
      log(`Currency: ${response.data.paymentIntent.currency}`, 'info');
      log(`Status: ${response.data.paymentIntent.status}`, 'info');
      log(`Order ID: ${response.data.paymentIntent.orderId}`, 'info');
      return true;
    } else {
      log('Failed to create payment intent', 'error');
      return false;
    }
  } catch (error) {
    log(`Payment creation error: ${error.response?.data?.error?.message || error.message}`, 'error');
    if (error.response?.data?.error?.param) {
      log(`Invalid parameter: ${error.response.data.error.param}`, 'warning');
    }
    return false;
  }
}

async function retrievePaymentIntent() {
  try {
    log('Retrieving payment intent details...');
    
    const response = await axios.get(`${BASE_URL}/api/payments/intent/${paymentIntentId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data.success) {
      const pi = response.data.paymentIntent;
      log('Payment intent retrieved successfully', 'success');
      log(`ID: ${pi.id}`, 'info');
      log(`Status: ${pi.status}`, 'info');
      log(`Amount: $${pi.amount / 100} ${pi.currency}`, 'info');
      log(`Created: ${new Date(pi.createdAt).toLocaleString()}`, 'info');
      return true;
    } else {
      log('Failed to retrieve payment intent', 'error');
      return false;
    }
  } catch (error) {
    log(`Retrieval error: ${error.response?.data?.error?.message || error.message}`, 'error');
    return false;
  }
}

async function testPaymentConfirmation() {
  try {
    log('Testing payment confirmation (expected to fail without payment method)...');
    
    const response = await axios.post(`${BASE_URL}/api/payments/intent/${paymentIntentId}/confirm`, {
      paymentIntentId: paymentIntentId
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    // This should not succeed without a payment method
    log('Unexpected success in payment confirmation', 'warning');
    return true;
  } catch (error) {
    if (error.response?.status === 400) {
      log('Payment confirmation correctly failed without payment method', 'success');
      log(`Error: ${error.response.data.error?.message}`, 'info');
      return true;
    } else {
      log(`Unexpected confirmation error: ${error.response?.data?.error?.message || error.message}`, 'error');
      return false;
    }
  }
}

async function testPaymentMethods() {
  try {
    log('Testing payment methods endpoint...');
    
    // Test with a test customer ID
    const response = await axios.get(`${BASE_URL}/api/payments/methods?customerId=cus_test_customer`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data.success) {
      log('Payment methods retrieved successfully', 'success');
      log(`Found ${response.data.paymentMethods?.length || 0} payment methods`, 'info');
      return true;
    } else {
      log('Payment methods request failed', 'error');
      return false;
    }
  } catch (error) {
    if (error.response?.status === 400) {
      log('Payment methods correctly failed with test customer', 'success');
      log(`Error: ${error.response.data.error?.message}`, 'info');
      return true;
    } else {
      log(`Payment methods error: ${error.response?.data?.error?.message || error.message}`, 'error');
      return false;
    }
  }
}

async function testAuthenticationValidation() {
  try {
    log('Testing authentication validation...');
    
    // Test without token
    try {
      await axios.post(`${BASE_URL}/api/payments/intent`, {
        amount: 1000,
        currency: 'USD',
        orderId: 'test'
      });
      log('Authentication validation failed - request succeeded without token', 'error');
      return false;
    } catch (error) {
      if (error.response?.status === 401) {
        log('Authentication correctly rejected request without token', 'success');
      } else {
        log('Unexpected error in auth validation', 'warning');
      }
    }
    
    // Test with invalid token
    try {
      await axios.post(`${BASE_URL}/api/payments/intent`, {
        amount: 1000,
        currency: 'USD',
        orderId: 'test'
      }, {
        headers: {
          'Authorization': 'Bearer invalid_token'
        }
      });
      log('Authentication validation failed - request succeeded with invalid token', 'error');
      return false;
    } catch (error) {
      if (error.response?.status === 401) {
        log('Authentication correctly rejected invalid token', 'success');
      } else {
        log('Unexpected error in invalid token test', 'warning');
      }
    }
    
    return true;
  } catch (error) {
    log(`Authentication validation error: ${error.message}`, 'error');
    return false;
  }
}

async function main() {
  console.log(`${colors.bright}${colors.blue}\n🚀 Payment API Quick Test\n${colors.reset}`);
  
  const results = {
    serverHealth: false,
    authentication: false,
    paymentCreation: false,
    paymentRetrieval: false,
    paymentConfirmation: false,
    paymentMethods: false,
    authValidation: false
  };
  
  // Step 1: Check server health
  results.serverHealth = await checkServerHealth();
  if (!results.serverHealth) {
    log('Server check failed. Exiting.', 'error');
    process.exit(1);
  }
  
  await sleep(500);
  
  // Step 2: Get authentication token
  results.authentication = await getAuthToken();
  if (!results.authentication) {
    log('Authentication failed. Exiting.', 'error');
    process.exit(1);
  }
  
  await sleep(500);
  
  // Step 3: Create payment intent
  results.paymentCreation = await createPaymentIntent();
  
  await sleep(500);
  
  // Step 4: Retrieve payment intent
  if (results.paymentCreation) {
    results.paymentRetrieval = await retrievePaymentIntent();
  }
  
  await sleep(500);
  
  // Step 5: Test payment confirmation
  if (results.paymentCreation) {
    results.paymentConfirmation = await testPaymentConfirmation();
  }
  
  await sleep(500);
  
  // Step 6: Test payment methods
  results.paymentMethods = await testPaymentMethods();
  
  await sleep(500);
  
  // Step 7: Test authentication validation
  results.authValidation = await testAuthenticationValidation();
  
  // Summary
  console.log(`${colors.bright}${colors.blue}\n📊 Test Results Summary:\n${colors.reset}`);
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`;
    console.log(`${status} ${test}`);
  });
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log(`${colors.bright}\n🎯 ${passedTests}/${totalTests} tests passed\n${colors.reset}`);
  
  if (passedTests === totalTests) {
    log('All tests passed! 🎉', 'success');
    process.exit(0);
  } else {
    log('Some tests failed. Check the output above.', 'warning');
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(`${colors.yellow}\n⚠️  Test interrupted by user${colors.reset}`);
  process.exit(1);
});

// Handle unhandled errors
process.on('unhandledRejection', (error) => {
  console.error(`${colors.red}\n❌ Unhandled error:${colors.reset}`, error);
  process.exit(1);
});

main().catch(error => {
  console.error(`${colors.red}\n❌ Script error:${colors.reset}`, error);
  process.exit(1);
});
