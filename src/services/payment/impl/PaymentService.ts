/**
 * Payment Service Implementation
 * 
 * Handles payment processing via Stripe integration.
 * Uses dependency injection for Stripe client.
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
  PaymentIntent as PaymentIntentType,
  PaymentMethod,
  PaymentError
} from '@marcopersi/shared';
import { IPaymentService } from '../IPaymentService';

export class PaymentServiceImpl implements IPaymentService {
  constructor(private readonly stripe: Stripe) {}

  /**
   * Create a payment intent using Stripe
   */
  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse> {
    try {
      const stripePaymentIntent = await this.stripe.paymentIntents.create({
        amount: request.amount,
        currency: request.currency.toLowerCase(),
        customer: request.customerId,
        payment_method: request.paymentMethodId,
        description: request.description,
        metadata: {
          orderId: request.orderId,
          ...request.metadata
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      const paymentIntent: PaymentIntentType = this.mapStripePaymentIntent(stripePaymentIntent);

      return {
        success: true,
        paymentIntent
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw this.handleStripeError(error as Stripe.errors.StripeError);
    }
  }

  /**
   * Confirm a payment intent
   */
  async confirmPayment(paymentIntentId: string, request: ConfirmPaymentRequest): Promise<ConfirmPaymentResponse> {
    try {
      const confirmParams: Stripe.PaymentIntentConfirmParams = {};
      
      if (request.paymentMethodId) {
        confirmParams.payment_method = request.paymentMethodId;
      }
      
      if (request.returnUrl) {
        confirmParams.return_url = request.returnUrl;
      }

      const stripePaymentIntent = await this.stripe.paymentIntents.confirm(
        paymentIntentId,
        confirmParams
      );

      const paymentIntent: PaymentIntentType = this.mapStripePaymentIntent(stripePaymentIntent);

      return {
        success: true,
        paymentIntent
      };
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw this.handleStripeError(error as Stripe.errors.StripeError);
    }
  }

  /**
   * Retrieve a payment intent
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<RetrievePaymentIntentResponse> {
    try {
      const stripePaymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      const paymentIntent: PaymentIntentType = this.mapStripePaymentIntent(stripePaymentIntent);

      return {
        success: true,
        paymentIntent
      };
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      throw this.handleStripeError(error as Stripe.errors.StripeError);
    }
  }

  /**
   * List payment methods for a customer
   */
  async listPaymentMethods(request: ListPaymentMethodsRequest): Promise<ListPaymentMethodsResponse> {
    try {
      const params: Stripe.PaymentMethodListParams = {
        customer: request.customerId,
        limit: request.limit || 10,
      };

      if (request.type) {
        params.type = request.type as Stripe.PaymentMethodListParams.Type;
      }

      const stripePaymentMethods = await this.stripe.paymentMethods.list(params);

      const paymentMethods: PaymentMethod[] = stripePaymentMethods.data.map(pm => 
        this.mapStripePaymentMethod(pm)
      );

      return {
        success: true,
        paymentMethods,
        hasMore: stripePaymentMethods.has_more
      };
    } catch (error) {
      console.error('Error listing payment methods:', error);
      throw this.handleStripeError(error as Stripe.errors.StripeError);
    }
  }

  /**
   * Create a refund for a payment
   */
  async createRefund(request: RefundRequest): Promise<RefundResponse> {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: request.paymentIntentId,
      };

      if (request.amount) {
        refundParams.amount = request.amount;
      }

      if (request.reason) {
        refundParams.reason = request.reason as Stripe.RefundCreateParams.Reason;
      }

      if (request.metadata) {
        refundParams.metadata = request.metadata;
      }

      const stripeRefund = await this.stripe.refunds.create(refundParams);

      return {
        success: true,
        refund: {
          id: stripeRefund.id,
          amount: stripeRefund.amount,
          currency: stripeRefund.currency.toUpperCase() as 'USD' | 'EUR' | 'GBP' | 'CHF',
          status: (stripeRefund.status as 'succeeded' | 'canceled' | 'pending' | 'failed') || 'pending',
          reason: stripeRefund.reason || 'requested_by_customer',
          createdAt: new Date(stripeRefund.created * 1000)
        }
      };
    } catch (error) {
      console.error('Error creating refund:', error);
      throw this.handleStripeError(error as Stripe.errors.StripeError);
    }
  }

  /**
   * Process Stripe webhook events
   */
  async processWebhook(body: string, signature: string): Promise<Stripe.Event> {
    try {
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
      }

      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      // Log the event for debugging
      if (process.env.PAYMENT_DEBUG === 'true') {
        console.log('Stripe webhook event:', event.type, event.id);
      }

      return event;
    } catch (error) {
      console.error('Error processing webhook:', error);
      throw new Error('Invalid webhook signature');
    }
  }

  /**
   * Map Stripe PaymentIntent to our PaymentIntent type
   */
  private mapStripePaymentIntent(stripePI: Stripe.PaymentIntent): PaymentIntentType {
    return {
      id: stripePI.id,
      clientSecret: stripePI.client_secret || '',
      amount: stripePI.amount,
      currency: stripePI.currency.toUpperCase() as 'USD' | 'EUR' | 'GBP' | 'CHF',
      status: stripePI.status,
      orderId: stripePI.metadata?.orderId || '',
      customerId: stripePI.customer as string || undefined,
      paymentMethodId: stripePI.payment_method as string || undefined,
      metadata: stripePI.metadata || {},
      createdAt: new Date(stripePI.created * 1000),
      updatedAt: new Date() // Stripe doesn't track updated_at, use current time
    };
  }

  /**
   * Map Stripe PaymentMethod to our PaymentMethod type
   */
  private mapStripePaymentMethod(stripePM: Stripe.PaymentMethod): PaymentMethod {
    // Map Stripe payment method types to our supported types
    let paymentMethodType: 'card' | 'bank_transfer' | 'sepa_debit';
    switch (stripePM.type) {
      case 'card':
        paymentMethodType = 'card';
        break;
      case 'us_bank_account':
        paymentMethodType = 'bank_transfer';
        break;
      case 'sepa_debit':
        paymentMethodType = 'sepa_debit';
        break;
      default:
        paymentMethodType = 'card'; // Default fallback
    }

    return {
      id: stripePM.id,
      type: paymentMethodType,
      isDefault: false, // Stripe doesn't have a direct default concept, would need customer.invoice_settings.default_payment_method
      last4: stripePM.card?.last4 || stripePM.us_bank_account?.last4 || undefined,
      brand: stripePM.card?.brand || undefined,
      expiryMonth: stripePM.card?.exp_month || undefined,
      expiryYear: stripePM.card?.exp_year || undefined,
      bankName: stripePM.us_bank_account?.bank_name || undefined,
      accountLast4: stripePM.us_bank_account?.last4 || undefined,
      createdAt: new Date(stripePM.created * 1000),
      updatedAt: new Date() // Stripe doesn't track updated_at, use current time
    };
  }

  /**
   * Handle Stripe errors and map to our PaymentError type
   */
  private handleStripeError(error: Stripe.errors.StripeError): PaymentError {
    const paymentError: PaymentError = {
      type: 'api_error',
      code: 'unknown_error',
      message: 'An unexpected error occurred'
    };

    if (error instanceof Stripe.errors.StripeCardError) {
      paymentError.type = 'card_error';
      paymentError.code = error.code || 'card_declined';
      paymentError.message = error.message;
      paymentError.param = error.param;
    } else if (error instanceof Stripe.errors.StripeRateLimitError) {
      paymentError.type = 'api_error'; // Map rate limit to api_error since we don't have rate_limit_error
      paymentError.code = 'rate_limit_exceeded';
      paymentError.message = 'Too many requests made to the API too quickly';
    } else if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      paymentError.type = 'validation_error'; // Map invalid request to validation_error
      paymentError.code = error.code || 'invalid_request';
      paymentError.message = error.message;
      paymentError.param = error.param;
    } else if (error instanceof Stripe.errors.StripeAPIError) {
      paymentError.type = 'api_error';
      paymentError.code = error.code || 'api_error';
      paymentError.message = error.message;
    } else if (error instanceof Stripe.errors.StripeConnectionError) {
      paymentError.type = 'api_error'; // Map connection error to api_error
      paymentError.code = 'connection_error';
      paymentError.message = 'Network communication with Stripe failed';
    } else if (error instanceof Stripe.errors.StripeAuthenticationError) {
      paymentError.type = 'authentication_error';
      paymentError.code = 'authentication_failed';
      paymentError.message = 'Authentication with Stripe failed';
    }

    return paymentError;
  }
}
