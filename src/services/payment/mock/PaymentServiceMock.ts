/**
 * Payment Service Mock Implementation
 * 
 * Mock implementation for testing without Stripe API calls
 */

import Stripe from 'stripe';
import {
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  ConfirmPaymentRequest,
  ConfirmPaymentResponse,
  ListPaymentMethodsRequest,
  ListPaymentMethodsResponse,
  RetrievePaymentIntentResponse,
  RefundRequest,
  RefundResponse,
  PaymentIntent,
  PaymentMethod
} from '@marcopersi/shared';
import { IPaymentService } from '../IPaymentService';

export class PaymentServiceMock implements IPaymentService {
  private paymentIntents: Map<string, PaymentIntent> = new Map();
  private paymentMethods: Map<string, PaymentMethod[]> = new Map();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const mockPaymentIntent: PaymentIntent = {
      id: 'pi_mock_123',
      clientSecret: 'pi_mock_123_secret_456',
      amount: 10000,
      currency: 'USD',
      status: 'succeeded',
      orderId: 'order-001',
      customerId: 'cus_mock_123',
      paymentMethodId: 'pm_mock_card_123',
      metadata: { test: 'true' },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    };

    this.paymentIntents.set(mockPaymentIntent.id, mockPaymentIntent);

    const mockPaymentMethods: PaymentMethod[] = [
      {
        id: 'pm_mock_card_123',
        type: 'card',
        isDefault: true,
        last4: '4242',
        brand: 'visa',
        expiryMonth: 12,
        expiryYear: 2025,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      }
    ];

    this.paymentMethods.set('cus_mock_123', mockPaymentMethods);
  }

  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse> {
    const paymentIntent: PaymentIntent = {
      id: `pi_mock_${Date.now()}`,
      clientSecret: `pi_mock_${Date.now()}_secret`,
      amount: request.amount,
      currency: request.currency,
      status: 'requires_confirmation',
      orderId: request.orderId,
      customerId: request.customerId,
      paymentMethodId: request.paymentMethodId,
      metadata: request.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.paymentIntents.set(paymentIntent.id, paymentIntent);

    return {
      success: true,
      paymentIntent
    };
  }

  async confirmPayment(paymentIntentId: string, _request: ConfirmPaymentRequest): Promise<ConfirmPaymentResponse> {
    const paymentIntent = this.paymentIntents.get(paymentIntentId);

    if (!paymentIntent) {
      throw new Error(`Payment intent not found: ${paymentIntentId}`);
    }

    const confirmedIntent: PaymentIntent = {
      ...paymentIntent,
      status: 'succeeded',
      updatedAt: new Date()
    };

    this.paymentIntents.set(paymentIntentId, confirmedIntent);

    return {
      success: true,
      paymentIntent: confirmedIntent
    };
  }

  async retrievePaymentIntent(paymentIntentId: string): Promise<RetrievePaymentIntentResponse> {
    const paymentIntent = this.paymentIntents.get(paymentIntentId);

    if (!paymentIntent) {
      throw new Error(`Payment intent not found: ${paymentIntentId}`);
    }

    return {
      success: true,
      paymentIntent
    };
  }

  async listPaymentMethods(request: ListPaymentMethodsRequest): Promise<ListPaymentMethodsResponse> {
    const methods = this.paymentMethods.get(request.customerId) || [];
    const limit = request.limit || 10;

    return {
      success: true,
      paymentMethods: methods.slice(0, limit),
      hasMore: methods.length > limit
    };
  }

  async createRefund(request: RefundRequest): Promise<RefundResponse> {
    const paymentIntent = this.paymentIntents.get(request.paymentIntentId);

    if (!paymentIntent) {
      throw new Error(`Payment intent not found: ${request.paymentIntentId}`);
    }

    return {
      success: true,
      refund: {
        id: `re_mock_${Date.now()}`,
        amount: request.amount || paymentIntent.amount,
        currency: paymentIntent.currency,
        status: 'succeeded',
        reason: request.reason || 'requested_by_customer',
        createdAt: new Date()
      }
    };
  }

  async processWebhook(_body: string, _signature: string): Promise<Stripe.Event> {
    // Mock webhook event
    return {
      id: `evt_mock_${Date.now()}`,
      object: 'event',
      api_version: '2025-07-30.basil',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {}
      },
      livemode: false,
      pending_webhooks: 0,
      request: null,
      type: 'payment_intent.succeeded'
    } as Stripe.Event;
  }

  // Test helper methods
  clear(): void {
    this.paymentIntents.clear();
    this.paymentMethods.clear();
  }

  reset(): void {
    this.clear();
    this.initializeMockData();
  }
}
