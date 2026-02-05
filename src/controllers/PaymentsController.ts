/**
 * Payments Controller - tsoa implementation
 */

import {
  Controller,
  Get,
  Post,
  Route,
  Tags,
  Body,
  Path,
  Query,
  Response,
  SuccessResponse,
  Security
} from "tsoa";
import {
  PaymentError,
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  ConfirmPaymentRequest,
  ConfirmPaymentResponse,
  ListPaymentMethodsRequest,
  ListPaymentMethodsResponse,
  RetrievePaymentIntentResponse,
  validateCreatePaymentIntent,
  validateConfirmPayment,
  validateListPaymentMethods
} from "@marcopersi/shared";
import { PaymentServiceFactory, IPaymentService } from "../services/payment";
import { createLogger } from "../utils/logger";

const logger = createLogger("PaymentsController");

interface PaymentErrorResponse {
  success: false;
  error: PaymentError;
}

@Route("payments")
@Tags("Payments")
@Security("bearerAuth")
export class PaymentsController extends Controller {
  private readonly paymentService: IPaymentService;

  constructor() {
    super();
    this.paymentService = PaymentServiceFactory.create();
  }

  /**
   * Create a payment intent
   */
  @Post("intent")
  @SuccessResponse(201, "Payment intent created")
  @Response<PaymentErrorResponse>(400, "Invalid request data")
  @Response<PaymentErrorResponse>(500, "Internal server error")
  public async createPaymentIntent(
    @Body() requestBody: CreatePaymentIntentRequest
  ): Promise<CreatePaymentIntentResponse | PaymentErrorResponse> {
    try {
      const validationResult = validateCreatePaymentIntent(requestBody);
      if (!validationResult.success) {
        const error: PaymentError = {
          code: "validation_error",
          message: "Invalid request data",
          type: "validation_error",
          param: validationResult.error.issues[0]?.path.join(".") || "unknown"
        };
        this.setStatus(400);
        return { success: false, error };
      }

      const response = await this.paymentService.createPaymentIntent(validationResult.data);
      this.setStatus(201);
      return response;
    } catch (error) {
      logger.error("Error in createPaymentIntent", error);
      if (this.isPaymentError(error)) {
        const statusCode = this.getStatusCodeForError(error);
        this.setStatus(statusCode);
        return { success: false, error };
      }
      const paymentError: PaymentError = {
        code: "internal_error",
        message: "An unexpected error occurred",
        type: "api_error"
      };
      this.setStatus(500);
      return { success: false, error: paymentError };
    }
  }

  /**
   * Confirm a payment intent
   */
  @Post("intent/{id}/confirm")
  @SuccessResponse(200, "Payment confirmed")
  @Response<PaymentErrorResponse>(400, "Invalid request data")
  @Response<PaymentErrorResponse>(500, "Internal server error")
  public async confirmPayment(
    @Path() id: string,
    @Body() requestBody: Partial<ConfirmPaymentRequest>
  ): Promise<ConfirmPaymentResponse | PaymentErrorResponse> {
    try {
      if (!id) {
        const error: PaymentError = {
          code: "missing_payment_intent_id",
          message: "Payment intent ID is required",
          type: "validation_error",
          param: "paymentIntentId"
        };
        this.setStatus(400);
        return { success: false, error };
      }

      const validationResult = validateConfirmPayment(requestBody);
      if (!validationResult.success) {
        const error: PaymentError = {
          code: "validation_error",
          message: "Invalid request data",
          type: "validation_error",
          param: validationResult.error.issues[0]?.path.join(".") || "unknown"
        };
        this.setStatus(400);
        return { success: false, error };
      }

      const request: ConfirmPaymentRequest = {
        ...validationResult.data,
        paymentIntentId: id
      };

      const response = await this.paymentService.confirmPayment(id, request);
      return response;
    } catch (error) {
      logger.error("Error in confirmPayment", error);
      if (this.isPaymentError(error)) {
        const statusCode = this.getStatusCodeForError(error);
        this.setStatus(statusCode);
        return { success: false, error };
      }
      const paymentError: PaymentError = {
        code: "internal_error",
        message: "An unexpected error occurred",
        type: "api_error"
      };
      this.setStatus(500);
      return { success: false, error: paymentError };
    }
  }

  /**
   * Retrieve a payment intent
   */
  @Get("intent/{id}")
  @SuccessResponse(200, "Payment intent retrieved")
  @Response<PaymentErrorResponse>(400, "Invalid request data")
  @Response<PaymentErrorResponse>(500, "Internal server error")
  public async retrievePaymentIntent(
    @Path() id: string
  ): Promise<RetrievePaymentIntentResponse | PaymentErrorResponse> {
    try {
      if (!id) {
        const error: PaymentError = {
          code: "missing_payment_intent_id",
          message: "Payment intent ID is required",
          type: "validation_error",
          param: "paymentIntentId"
        };
        this.setStatus(400);
        return { success: false, error };
      }

      const response = await this.paymentService.retrievePaymentIntent(id);
      return response;
    } catch (error) {
      logger.error("Error in retrievePaymentIntent", error);
      if (this.isPaymentError(error)) {
        const statusCode = this.getStatusCodeForError(error);
        this.setStatus(statusCode);
        return { success: false, error };
      }
      const paymentError: PaymentError = {
        code: "internal_error",
        message: "An unexpected error occurred",
        type: "api_error"
      };
      this.setStatus(500);
      return { success: false, error: paymentError };
    }
  }

  /**
   * List payment methods for a customer
   */
  @Get("methods")
  @SuccessResponse(200, "Payment methods retrieved")
  @Response<PaymentErrorResponse>(400, "Invalid request data")
  @Response<PaymentErrorResponse>(500, "Internal server error")
  public async listPaymentMethods(
    @Query() customerId: string
  ): Promise<ListPaymentMethodsResponse | PaymentErrorResponse> {
    try {
      const validationResult = validateListPaymentMethods({ customerId } as ListPaymentMethodsRequest);
      if (!validationResult.success) {
        const error: PaymentError = {
          code: "validation_error",
          message: "Invalid request parameters",
          type: "validation_error",
          param: validationResult.error.issues[0]?.path.join(".") || "unknown"
        };
        this.setStatus(400);
        return { success: false, error };
      }

      const response = await this.paymentService.listPaymentMethods(validationResult.data);
      return response;
    } catch (error) {
      logger.error("Error in listPaymentMethods", error);
      if (this.isPaymentError(error)) {
        const statusCode = this.getStatusCodeForError(error);
        this.setStatus(statusCode);
        return { success: false, error };
      }
      const paymentError: PaymentError = {
        code: "internal_error",
        message: "An unexpected error occurred",
        type: "api_error"
      };
      this.setStatus(500);
      return { success: false, error: paymentError };
    }
  }

  private isPaymentError(error: unknown): error is PaymentError {
    return !!error && typeof error === "object" && "code" in error && "message" in error && "type" in error;
  }

  private getStatusCodeForError(error: PaymentError): number {
    switch (error.type) {
      case "card_error":
      case "validation_error":
        return 400;
      case "authentication_error":
        return 401;
      case "api_error":
      default:
        return 500;
    }
  }
}
