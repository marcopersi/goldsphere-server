/**
 * Payment Service Factory
 * 
 * Creates Payment service instances with proper Stripe client injection
 */

import Stripe from 'stripe';
import { IPaymentService } from './IPaymentService';
import { PaymentServiceImpl } from './impl/PaymentService';
import { PaymentServiceMock } from './mock/PaymentServiceMock';

export class PaymentServiceFactory {
  /**
   * Create production Payment service with Stripe
   */
  static create(): IPaymentService {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-07-30.basil',
    });

    return new PaymentServiceImpl(stripe);
  }

  /**
   * Create Payment service with custom Stripe client (for testing with specific config)
   */
  static createWithStripe(stripe: Stripe): IPaymentService {
    return new PaymentServiceImpl(stripe);
  }

  /**
   * Create mock Payment service for testing
   */
  static createMock(): IPaymentService {
    return new PaymentServiceMock();
  }
}
