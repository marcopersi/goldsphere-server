/**
 * Payment Service Interface
 * 
 * Defines the contract for payment processing operations
 */

import {
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  ConfirmPaymentRequest,
  ConfirmPaymentResponse,
  ListPaymentMethodsRequest,
  ListPaymentMethodsResponse,
  RetrievePaymentIntentResponse,
  RefundRequest,
  RefundResponse
} from '@marcopersi/shared';
import Stripe from 'stripe';

export interface IPaymentService {
  /**
   * Create a payment intent using Stripe
   */
  createPaymentIntent(request: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse>;

  /**
   * Confirm a payment intent
   */
  confirmPayment(paymentIntentId: string, request: ConfirmPaymentRequest): Promise<ConfirmPaymentResponse>;

  /**
   * Retrieve a payment intent
   */
  retrievePaymentIntent(paymentIntentId: string): Promise<RetrievePaymentIntentResponse>;

  /**
   * List payment methods for a customer
   */
  listPaymentMethods(request: ListPaymentMethodsRequest): Promise<ListPaymentMethodsResponse>;

  /**
   * Create a refund for a payment
   */
  createRefund(request: RefundRequest): Promise<RefundResponse>;

  /**
   * Process Stripe webhook events
   */
  processWebhook(body: string, signature: string): Promise<Stripe.Event>;
}
