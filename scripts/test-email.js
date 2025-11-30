#!/usr/bin/env node
/**
 * Email Configuration Test Script
 * 
 * This script tests the email service configuration and sends a test email.
 * Run with: npm run test:email or node scripts/test-email.js
 */

import 'dotenv/config';
import { EmailService } from '../src/services/EmailService.js';

async function testEmailConfiguration() {
  console.log('🧪 Testing Email Service Configuration...\n');

  // Check environment variables
  console.log('📧 Email Configuration:');
  console.log(`  SMTP_HOST: ${process.env.SMTP_HOST}`);
  console.log(`  SMTP_PORT: ${process.env.SMTP_PORT}`);
  console.log(`  SMTP_SECURE: ${process.env.SMTP_SECURE}`);
  console.log(`  SMTP_USER: ${process.env.SMTP_USER}`);
  console.log(`  SMTP_PASSWORD: ${process.env.SMTP_PASSWORD ? '[SET]' : '[NOT SET]'}`);
  console.log(`  FROM_EMAIL: ${process.env.FROM_EMAIL}\n`);

  // Validate required environment variables
  const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`  - ${varName}`));
    console.log('\n💡 Please set these variables in your .env file');
    process.exit(1);
  }

  try {
    // Create email service instance
    const emailService = new EmailService('http://localhost:8888');

    // Test connection
    console.log('🔗 Testing SMTP connection...');
    const isConnected = await emailService.testConnection();
    
    if (!isConnected) {
      console.error('❌ Failed to connect to SMTP server');
      process.exit(1);
    }

    // Send test email (optional)
    const testEmail = process.argv[2];
    if (testEmail) {
      console.log(`📤 Sending test verification email to: ${testEmail}`);
      await emailService.sendEmailVerification(
        testEmail,
        'test-token-123',
        { firstName: 'Test', lastName: 'User' }
      );
      console.log('✅ Test email sent successfully!');
    } else {
      console.log('💡 To send a test email, run: npm run test:email your.email@example.com');
    }

    console.log('\n🎉 Email service configuration is working correctly!');
  } catch (error) {
    console.error('❌ Email service test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testEmailConfiguration().catch(console.error);
