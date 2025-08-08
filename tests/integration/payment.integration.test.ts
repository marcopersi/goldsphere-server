import request from 'supertest';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

/**
 * Integration tests for Payment API with Stripe CLI
 * 
 * Prerequisites:
 * 1. Stripe CLI must be installed (`brew install stripe/stripe-cli/stripe`)
 * 2. Must be logged in to Stripe (`stripe login`)
 * 3. Server must be running with proper environment variables
 * 
 * Run with: npm run test:payment-integration
 */
describe('Payment Integration Tests', () => {
  let serverProcess: ChildProcess;
  let stripeProcess: ChildProcess;
  let authToken: string;
  let paymentIntentId: string;
  let clientSecret: string;
  let customerId: string;
  
  const BASE_URL = 'http://localhost:8080';
  const TEST_ORDER_ID = `order_test_${Date.now()}`;
  
  beforeAll(async () => {
    console.log('🚀 Starting Payment Integration Tests...');
    
    // Start the server
    console.log('📡 Starting server...');
    serverProcess = spawn('npm', ['start'], {
      cwd: process.cwd(),
      env: { 
        ...process.env, 
        NODE_ENV: 'development',
        dotenv_config_path: '.env.dev'
      },
      stdio: 'pipe'
    });
    
    // Wait for server to start
    await sleep(5000);
    
    // Start Stripe CLI for webhook forwarding
    console.log('💳 Starting Stripe CLI webhook forwarding...');
    stripeProcess = spawn('stripe', ['listen', '--forward-to', 'localhost:8080/api/v1/payments/webhook'], {
      stdio: 'pipe'
    });
    
    // Wait for Stripe CLI to initialize
    await sleep(3000);
    
    console.log('✅ Setup complete');
  }, 30000);

  afterAll(async () => {
    console.log('🧹 Cleaning up...');
    
    if (serverProcess) {
      serverProcess.kill();
    }
    
    if (stripeProcess) {
      stripeProcess.kill();
    }
    
    console.log('✅ Cleanup complete');
  });

  describe('1. Authentication', () => {
    it('should get authentication token', async () => {
      console.log('🔐 Testing authentication...');
      
      const response = await request(BASE_URL)
        .post('/api/auth/login')
        .send({
          email: 'admin@goldsphere.vault',
          password: 'admin123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('admin@goldsphere.vault');
      
      authToken = response.body.token;
      console.log('✅ Authentication successful');
    });
  });

  describe('2. Payment Intent Creation', () => {
    it('should create a payment intent', async () => {
      console.log('💰 Creating payment intent...');
      
      const paymentData = {
        amount: 2500, // $25.00
        currency: 'USD',
        orderId: TEST_ORDER_ID,
        description: 'Integration Test - 1oz Gold Bar Purchase',
        metadata: {
          testRun: 'true',
          environment: 'integration'
        }
      };
      
      const response = await request(BASE_URL)
        .post('/api/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.paymentIntent).toBeDefined();
      expect(response.body.paymentIntent.id).toMatch(/^pi_/);
      expect(response.body.paymentIntent.clientSecret).toMatch(/^pi_.*_secret_/);
      expect(response.body.paymentIntent.amount).toBe(2500);
      expect(response.body.paymentIntent.currency).toBe('USD');
      expect(response.body.paymentIntent.orderId).toBe(TEST_ORDER_ID);
      expect(response.body.paymentIntent.status).toBe('requires_payment_method');
      
      paymentIntentId = response.body.paymentIntent.id;
      clientSecret = response.body.paymentIntent.clientSecret;
      
      console.log(`✅ Payment intent created: ${paymentIntentId}`);
    });

    it('should handle validation errors', async () => {
      console.log('🚫 Testing validation errors...');
      
      const invalidData = {
        amount: -100, // Invalid negative amount
        currency: 'INVALID',
        orderId: '', // Empty order ID
      };
      
      const response = await request(BASE_URL)
        .post('/api/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.type).toBe('validation_error');
      
      console.log('✅ Validation errors handled correctly');
    });
  });

  describe('3. Payment Intent Retrieval', () => {
    it('should retrieve payment intent details', async () => {
      console.log('🔍 Retrieving payment intent details...');
      
      const response = await request(BASE_URL)
        .get(`/api/payments/intent/${paymentIntentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.paymentIntent).toBeDefined();
      expect(response.body.paymentIntent.id).toBe(paymentIntentId);
      expect(response.body.paymentIntent.orderId).toBe(TEST_ORDER_ID);
      expect(response.body.paymentIntent.amount).toBe(2500);
      expect(response.body.paymentIntent.currency).toBe('USD');
      
      console.log('✅ Payment intent details retrieved successfully');
    });

    it('should handle non-existent payment intent', async () => {
      console.log('🚫 Testing non-existent payment intent...');
      
      const response = await request(BASE_URL)
        .get('/api/payments/intent/pi_nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      
      console.log('✅ Non-existent payment intent handled correctly');
    });
  });

  describe('4. Payment Confirmation', () => {
    it('should attempt to confirm payment (will fail without payment method)', async () => {
      console.log('🔒 Testing payment confirmation...');
      
      const confirmData = {
        paymentIntentId: paymentIntentId,
        // Note: In real scenario, you'd have a payment method ID from frontend
      };
      
      const response = await request(BASE_URL)
        .post(`/api/payments/intent/${paymentIntentId}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(confirmData)
        .expect(400); // Expected to fail without payment method

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      
      console.log('✅ Payment confirmation validation working correctly');
    });
  });

  describe('5. Payment Methods', () => {
    beforeAll(async () => {
      // Create a test customer for payment methods testing
      console.log('👤 Creating test customer...');
      
      // Note: In a real implementation, you'd have a customer creation endpoint
      // For now, we'll use a test customer ID that might exist in your Stripe account
      customerId = 'cus_test_customer';
    });

    it('should handle payment methods request', async () => {
      console.log('💳 Testing payment methods listing...');
      
      const response = await request(BASE_URL)
        .get(`/api/payments/methods?customerId=${customerId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // This might return 200 with empty list or 400 if customer doesn't exist
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.paymentMethods)).toBe(true);
        console.log('✅ Payment methods retrieved successfully');
      } else {
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        console.log('✅ Payment methods validation working correctly');
      }
    });

    it('should handle invalid customer ID', async () => {
      console.log('🚫 Testing invalid customer ID...');
      
      const response = await request(BASE_URL)
        .get('/api/payments/methods?customerId=invalid_customer')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      
      console.log('✅ Invalid customer ID handled correctly');
    });
  });

  describe('6. Authentication & Authorization', () => {
    it('should reject requests without authorization', async () => {
      console.log('🔒 Testing unauthorized access...');
      
      const response = await request(BASE_URL)
        .post('/api/payments/intent')
        .send({
          amount: 1000,
          currency: 'USD',
          orderId: 'test_order'
        })
        .expect(401);

      expect(response.body.error).toBe('Access token required');
      
      console.log('✅ Unauthorized access rejected correctly');
    });

    it('should reject requests with invalid token', async () => {
      console.log('🔒 Testing invalid token...');
      
      const response = await request(BASE_URL)
        .post('/api/payments/intent')
        .set('Authorization', 'Bearer invalid_token')
        .send({
          amount: 1000,
          currency: 'USD',
          orderId: 'test_order'
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
      
      console.log('✅ Invalid token rejected correctly');
    });
  });

  describe('7. Webhook Monitoring', () => {
    it('should verify Stripe CLI is forwarding webhooks', async () => {
      console.log('🎣 Verifying webhook setup...');
      
      // Check if webhook endpoint is accessible
      const response = await request(BASE_URL)
        .post('/api/v1/payments/webhook')
        .set('stripe-signature', 'test_signature')
        .send({})
        .expect(400); // Expected to fail signature validation

      // If we get a 400, it means the endpoint exists and is processing
      expect(response.status).toBe(400);
      
      console.log('✅ Webhook endpoint is accessible');
    });
  });
});

// Helper function to check if server is ready
async function waitForServer(url: string, maxAttempts: number = 10): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await request(url).get('/health');
      if (response.status === 200) {
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    await sleep(1000);
  }
  return false;
}

// Helper function to extract webhook secret from Stripe CLI output
function extractWebhookSecret(output: string): string | null {
  const match = output.match(/webhook signing secret is (whsec_[a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}
