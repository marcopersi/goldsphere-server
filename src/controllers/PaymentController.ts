import { Request, Response } from 'express';
import {
  PaymentMethod,
  PaymentIntent,
  PaymentMethodSchema,
  PaymentIntentCreateSchema,
  PaymentIntentConfirmSchema
} from '@marcopersi/shared';
import { PaymentService } from '../services/PaymentService';
import { z } from 'zod';

export class PaymentController {
  private readonly paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  /**
   * Create a payment intent
   */
  createPaymentIntent = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request using shared Zod schema
      const validationResult = validateCreatePaymentIntent(req.body);
      if (!validationResult.success) {
        const error: PaymentError = {
          code: 'validation_error',
          message: 'Invalid request data',
          type: 'validation_error',
          param: validationResult.error.issues[0]?.path.join('.') || 'unknown'
        };
        res.status(400).json({ success: false, error });
        return;
      }

      const request: CreatePaymentIntentRequest = validationResult.data;
      const response = await this.paymentService.createPaymentIntent(request);
      
      res.status(201).json(response);
    } catch (error) {
      console.error('Error in createPaymentIntent:', error);
      
      if (this.isPaymentError(error)) {
        const statusCode = this.getStatusCodeForError(error);
        res.status(statusCode).json({ success: false, error });
      } else {
        const paymentError: PaymentError = {
          code: 'internal_error',
          message: 'An unexpected error occurred',
          type: 'api_error'
        };
        res.status(500).json({ success: false, error: paymentError });
      }
    }
  };

  /**
   * Confirm a payment intent
   */
  confirmPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const paymentIntentId = req.params.id;
      
      if (!paymentIntentId) {
        const error: PaymentError = {
          code: 'missing_payment_intent_id',
          message: 'Payment intent ID is required',
          type: 'validation_error',
          param: 'paymentIntentId'
        };
        res.status(400).json({ success: false, error });
        return;
      }

      // Validate request body if provided
      const validationResult = validateConfirmPayment(req.body);
      if (!validationResult.success) {
        const error: PaymentError = {
          code: 'validation_error',
          message: 'Invalid request data',
          type: 'validation_error',
          param: validationResult.error.issues[0]?.path.join('.') || 'unknown'
        };
        res.status(400).json({ success: false, error });
        return;
      }

      const request: ConfirmPaymentRequest = {
        ...validationResult.data,
        paymentIntentId
      };
      
      const response = await this.paymentService.confirmPayment(paymentIntentId, request);
      
      res.json(response);
    } catch (error) {
      console.error('Error in confirmPayment:', error);
      
      if (this.isPaymentError(error)) {
        const statusCode = this.getStatusCodeForError(error);
        res.status(statusCode).json({ success: false, error });
      } else {
        const paymentError: PaymentError = {
          code: 'internal_error',
          message: 'An unexpected error occurred',
          type: 'api_error'
        };
        res.status(500).json({ success: false, error: paymentError });
      }
    }
  };

  /**
   * Retrieve a payment intent
   */
  retrievePaymentIntent = async (req: Request, res: Response): Promise<void> => {
    try {
      const paymentIntentId = req.params.id;
      
      if (!paymentIntentId) {
        const error: PaymentError = {
          code: 'missing_payment_intent_id',
          message: 'Payment intent ID is required',
          type: 'validation_error',
          param: 'paymentIntentId'
        };
        res.status(400).json({ success: false, error });
        return;
      }

      const response = await this.paymentService.retrievePaymentIntent(paymentIntentId);
      
      res.json(response);
    } catch (error) {
      console.error('Error in retrievePaymentIntent:', error);
      
      if (this.isPaymentError(error)) {
        const statusCode = this.getStatusCodeForError(error);
        res.status(statusCode).json({ success: false, error });
      } else {
        const paymentError: PaymentError = {
          code: 'internal_error',
          message: 'An unexpected error occurred',
          type: 'api_error'
        };
        res.status(500).json({ success: false, error: paymentError });
      }
    }
  };

  /**
   * List payment methods for a customer
   */
  listPaymentMethods = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate query parameters
      const validationResult = validateListPaymentMethods(req.query);
      if (!validationResult.success) {
        const error: PaymentError = {
          code: 'validation_error',
          message: 'Invalid request parameters',
          type: 'validation_error',
          param: validationResult.error.issues[0]?.path.join('.') || 'unknown'
        };
        res.status(400).json({ success: false, error });
        return;
      }

      const request: ListPaymentMethodsRequest = validationResult.data;
      const response = await this.paymentService.listPaymentMethods(request);
      
      res.json(response);
    } catch (error) {
      console.error('Error in listPaymentMethods:', error);
      
      if (this.isPaymentError(error)) {
        const statusCode = this.getStatusCodeForError(error);
        res.status(statusCode).json({ success: false, error });
      } else {
        const paymentError: PaymentError = {
          code: 'internal_error',
          message: 'An unexpected error occurred',
          type: 'api_error'
        };
        res.status(500).json({ success: false, error: paymentError });
      }
    }
  };

  /**
   * Create a refund
   */
  createRefund = async (req: Request, res: Response): Promise<void> => {
    try {
      // Basic validation for refund request
      const refundSchema = z.object({
        paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
        amount: z.number().positive().optional(),
        reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
        metadata: z.record(z.string(), z.string()).optional()
      });

      const validationResult = refundSchema.safeParse(req.body);
      if (!validationResult.success) {
        const error: PaymentError = {
          code: 'validation_error',
          message: 'Invalid request data',
          type: 'validation_error',
          param: validationResult.error.issues[0]?.path.join('.') || 'unknown'
        };
        res.status(400).json({ success: false, error });
        return;
      }

      const request: RefundRequest = validationResult.data;
      const response = await this.paymentService.createRefund(request);
      
      res.status(201).json(response);
    } catch (error) {
      console.error('Error in createRefund:', error);
      
      if (this.isPaymentError(error)) {
        const statusCode = this.getStatusCodeForError(error);
        res.status(statusCode).json({ success: false, error });
      } else {
        const paymentError: PaymentError = {
          code: 'internal_error',
          message: 'An unexpected error occurred',
          type: 'api_error'
        };
        res.status(500).json({ success: false, error: paymentError });
      }
    }
  };

  /**
   * Type guard to check if error is a PaymentError
   */
  private isPaymentError(error: any): error is PaymentError {
    return error && typeof error === 'object' && 'code' in error && 'message' in error && 'type' in error;
  }

  /**
   * Get appropriate HTTP status code for payment error type
   */
  private getStatusCodeForError(error: PaymentError): number {
    switch (error.type) {
      case 'card_error':
      case 'validation_error':
        return 400;
      case 'authentication_error':
        return 401;
      case 'api_error':
      default:
        return 500;
    }
  }
}
