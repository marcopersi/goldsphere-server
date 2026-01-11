import { Request, Response } from 'express';
import Stripe from 'stripe';
import { PaymentServiceFactory, IPaymentService } from '../services/payment';

export class WebhookController {
  private readonly paymentService: IPaymentService;

  constructor() {
    this.paymentService = PaymentServiceFactory.create();
  }

  /**
   * Handle Stripe webhook events
   */
  stripeWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      
      if (!signature) {
        console.error('Missing stripe-signature header');
        res.status(400).json({ error: 'Missing stripe-signature header' });
        return;
      }

      // Get the raw body as string (middleware should have preserved this)
      const rawBody = req.body;
      
      // Process the webhook with Stripe
      const event = await this.paymentService.processWebhook(rawBody, signature);
      
      // Log the event
      console.log(`Received Stripe webhook: ${event.type} (${event.id})`);
      
      // Handle different event types
      await this.handleWebhookEvent(event);
      
      // Acknowledge receipt of the event
      res.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(400).json({ 
        error: 'Webhook signature verification failed',
        details: (error as Error).message 
      });
    }
  };

  /**
   * Handle specific webhook event types
   */
  private async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object);
        break;
        
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object);
        break;
        
      case 'payment_intent.canceled':
        await this.handlePaymentIntentCanceled(event.data.object);
        break;
        
      case 'payment_intent.requires_action':
        await this.handlePaymentIntentRequiresAction(event.data.object);
        break;
        
      case 'payment_method.attached':
        await this.handlePaymentMethodAttached(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object);
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        // Handle subscription events if needed for recurring payments
        console.log(`Subscription event: ${event.type}`);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Handle successful payment intent
   */
  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      console.log(`Payment succeeded: ${paymentIntent.id}`);
      
      // Extract order information from metadata
      const orderId = paymentIntent.metadata?.orderId;
      
      if (orderId) {
        // Update order status in database (you would implement this based on your order system)
        await this.updateOrderStatus(orderId, 'paid', {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          paymentMethod: paymentIntent.payment_method as string,
        });
        
        console.log(`Order ${orderId} marked as paid`);
      } else {
        console.warn(`Payment ${paymentIntent.id} succeeded but no orderId in metadata`);
      }
    } catch (error) {
      console.error('Error handling payment_intent.succeeded:', error);
    }
  }

  /**
   * Handle failed payment intent
   */
  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      console.log(`Payment failed: ${paymentIntent.id}`);
      
      const orderId = paymentIntent.metadata?.orderId;
      
      if (orderId) {
        await this.updateOrderStatus(orderId, 'payment_failed', {
          paymentIntentId: paymentIntent.id,
          lastError: paymentIntent.last_payment_error?.message || 'Unknown error',
        });
        
        console.log(`Order ${orderId} marked as payment failed`);
      }
    } catch (error) {
      console.error('Error handling payment_intent.payment_failed:', error);
    }
  }

  /**
   * Handle canceled payment intent
   */
  private async handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      console.log(`Payment canceled: ${paymentIntent.id}`);
      
      const orderId = paymentIntent.metadata?.orderId;
      
      if (orderId) {
        await this.updateOrderStatus(orderId, 'canceled', {
          paymentIntentId: paymentIntent.id,
        });
        
        console.log(`Order ${orderId} marked as canceled`);
      }
    } catch (error) {
      console.error('Error handling payment_intent.canceled:', error);
    }
  }

  /**
   * Handle payment intent that requires action
   */
  private async handlePaymentIntentRequiresAction(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      console.log(`Payment requires action: ${paymentIntent.id}`);
      
      const orderId = paymentIntent.metadata?.orderId;
      
      if (orderId) {
        await this.updateOrderStatus(orderId, 'requires_action', {
          paymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
        });
        
        console.log(`Order ${orderId} marked as requires action`);
      }
    } catch (error) {
      console.error('Error handling payment_intent.requires_action:', error);
    }
  }

  /**
   * Handle payment method attached to customer
   */
  private async handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
    try {
      console.log(`Payment method attached: ${paymentMethod.id} to customer ${paymentMethod.customer}`);
      
      // You could update your local payment methods cache here if needed
      
    } catch (error) {
      console.error('Error handling payment_method.attached:', error);
    }
  }

  /**
   * Handle successful invoice payment (for subscriptions)
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    try {
      console.log(`Invoice payment succeeded: ${invoice.id}`);
      
      // Handle subscription payment success if you have subscription-based orders
      
    } catch (error) {
      console.error('Error handling invoice.payment_succeeded:', error);
    }
  }

  /**
   * Update order status in your database
   * This is a placeholder - you would implement this based on your order system
   */
  private async updateOrderStatus(
    orderId: string, 
    status: string, 
    paymentDetails: Record<string, any>
  ): Promise<void> {
    try {
      // This is where you would update your orders table
      // For example:
      // await pool.query(
      //   'UPDATE orders SET status = $1, payment_details = $2, updated_at = NOW() WHERE id = $3',
      //   [status, JSON.stringify(paymentDetails), orderId]
      // );
      
      console.log(`Order ${orderId} status updated to ${status}`, paymentDetails);
      
      // You might also want to send notifications, emails, etc.
      if (status === 'paid') {
        await this.sendOrderConfirmationEmail(orderId);
      } else if (status === 'payment_failed') {
        await this.sendPaymentFailedEmail(orderId);
      }
      
    } catch (error) {
      console.error(`Error updating order ${orderId} status:`, error);
    }
  }

  /**
   * Send order confirmation email
   */
  private async sendOrderConfirmationEmail(orderId: string): Promise<void> {
    try {
      // Implement email sending logic here
      console.log(`Sending order confirmation email for order ${orderId}`);
    } catch (error) {
      console.error(`Error sending confirmation email for order ${orderId}:`, error);
    }
  }

  /**
   * Send payment failed email
   */
  private async sendPaymentFailedEmail(orderId: string): Promise<void> {
    try {
      // Implement email sending logic here
      console.log(`Sending payment failed email for order ${orderId}`);
    } catch (error) {
      console.error(`Error sending payment failed email for order ${orderId}:`, error);
    }
  }
}
