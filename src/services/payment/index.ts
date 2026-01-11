/**
 * Payment Service - Barrel Export
 * 
 * Central export point for Payment domain
 */

// Interfaces
export { IPaymentService } from './IPaymentService';

// Implementations
export { PaymentServiceImpl } from './impl/PaymentService';

// Mocks
export { PaymentServiceMock } from './mock/PaymentServiceMock';

// Factory
export { PaymentServiceFactory } from './PaymentServiceFactory';

// Re-export types from @marcopersi/shared for convenience
export {
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
  PaymentMethod,
  PaymentError
} from '@marcopersi/shared';
