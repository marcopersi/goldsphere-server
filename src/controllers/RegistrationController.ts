/**
 * Registration Controller - tsoa implementation
 * 
 * Handles user registration with comprehensive validation,
 * security measures, and audit logging.
 */

import {
  Controller,
  Get,
  Post,
  Route,
  Path,
  Body,
  Tags,
  SuccessResponse,
  Response,
  Request
} from "tsoa";
import express from "express";
import { UserRegistrationServiceImpl } from "../services/user/impl/UserRegistrationServiceImpl";
import { UserRepository } from "../services/user/repository/UserRepository";
import { PasswordService } from "../services/user/impl/PasswordService";
import { TokenService } from "../services/user/impl/TokenService";
import { EmailServiceFactory } from "../services/email";
import { getRequiredEnvVar } from "../config/environment";
import type { 
  EnhancedRegistrationRequest,
  EnhancedRegistrationResponse
} from "../services/user/registrationTypes";

// ============================================================================
// Request/Response Interfaces
// ============================================================================

interface RegistrationErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: {
    fields?: Array<{ path: string; message: string }>;
    field?: string;
    message?: string;
  };
}

interface EmailCheckResponse {
  exists: boolean;
}

interface ResendVerificationRequest {
  /** Email address to resend verification to */
  email: string;
}

interface ResendVerificationResponse {
  success: true;
  message: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getRegistrationServices() {
  const userRepository = new UserRepository();
  const passwordService = new PasswordService();
  const tokenService = new TokenService(getRequiredEnvVar('JWT_SECRET'));
  const emailService = EmailServiceFactory.create(
    getRequiredEnvVar('APP_BASE_URL'),
    getRequiredEnvVar('EMAIL_FROM')
  );
  const registrationService = new UserRegistrationServiceImpl(
    userRepository,
    passwordService,
    tokenService,
    emailService
  );
  return { registrationService, userRepository, passwordService, tokenService, emailService };
}

function getClientIpAddress(req: express.Request): string {
  return (
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function getErrorStatusCode(errorCode: string): number {
  switch (errorCode) {
    case "VALIDATION_ERROR":
    case "INVALID_EMAIL_FORMAT":
    case "INVALID_PASSWORD":
    case "INVALID_BIRTH_DATE":
    case "INVALID_COUNTRY":
    case "MISSING_REQUIRED_FIELD":
      return 400;
    case "EMAIL_ALREADY_EXISTS":
      return 409;
    case "RATE_LIMIT_EXCEEDED":
      return 429;
    case "INTERNAL_ERROR":
    default:
      return 500;
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================================================
// Controller
// ============================================================================

@Route("auth")
@Tags("Registration")
export class RegistrationController extends Controller {
  /**
   * Register a new user
   * Creates a complete user profile with personal information, address details,
   * and document processing history.
   * @param requestBody Registration data
   */
  @Post("register")
  @SuccessResponse(201, "Registration successful")
  @Response<RegistrationErrorResponse>(400, "Validation error")
  @Response<RegistrationErrorResponse>(409, "Email already exists")
  @Response<RegistrationErrorResponse>(429, "Rate limit exceeded")
  @Response<RegistrationErrorResponse>(500, "Internal server error")
  public async register(
    @Body() requestBody: EnhancedRegistrationRequest,
    @Request() req: express.Request
  ): Promise<EnhancedRegistrationResponse | RegistrationErrorResponse> {
    const clientInfo = {
      ipAddress: getClientIpAddress(req),
      userAgent: req.get("User-Agent") || "Unknown"
    };

    const result = await getRegistrationServices().registrationService.registerUser(
      requestBody,
      clientInfo
    );

    if (!result.success) {
      const statusCode = getErrorStatusCode(result.code);
      this.setStatus(statusCode);

      const fields = result.details?.validationErrors?.map((validationError) => ({
        path: validationError.field,
        message: validationError.message,
      }));

      return {
        success: false,
        code: result.code,
        error: result.error || "Registration failed",
        details: fields && fields.length > 0 ? { fields } : result.details,
      };
    }

    this.setStatus(201);
    return result;
  }

  /**
   * Check if email is already registered
   * Provides real-time feedback during registration.
   * @param email URL-encoded email address to check
   */
  @Get("register/check-email/{email}")
  @SuccessResponse(200, "Email check result")
  @Response<RegistrationErrorResponse>(400, "Invalid email format")
  @Response<RegistrationErrorResponse>(500, "Internal server error")
  public async checkEmail(
    @Path() email: string
  ): Promise<EmailCheckResponse | RegistrationErrorResponse> {
    const decodedEmail = decodeURIComponent(email);

    if (!isValidEmail(decodedEmail)) {
      this.setStatus(400);
      return {
        success: false,
        code: 'INVALID_EMAIL_FORMAT',
        error: "Invalid email format"
      };
    }

    const exists = await getRegistrationServices().registrationService.isEmailRegistered(decodedEmail);

    return { exists };
  }

  /**
   * Resend email verification
   * Allows users to request a new verification email.
   * Always returns success for security (prevents email enumeration).
   * @param requestBody Email to resend verification to
   */
  @Post("register/resend-verification")
  @SuccessResponse(200, "Verification email sent")
  @Response<RegistrationErrorResponse>(400, "Invalid email")
  @Response<RegistrationErrorResponse>(429, "Rate limit exceeded")
  @Response<RegistrationErrorResponse>(500, "Internal server error")
  public async resendVerification(
    @Body() requestBody: ResendVerificationRequest
  ): Promise<ResendVerificationResponse | RegistrationErrorResponse> {
    const { email } = requestBody;

    if (!email || !isValidEmail(email)) {
      this.setStatus(400);
      return {
        success: false,
        code: 'INVALID_EMAIL',
        error: "Valid email address is required"
      };
    }

    // Always return success for security (don't reveal if email exists)
    const { registrationService, userRepository, emailService } = getRegistrationServices();
    const user = await userRepository.findUserByEmail(email);

    if (user) {
      try {
        const verificationToken = await registrationService.generateEmailVerificationToken(user.id);

        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + 24);

        await userRepository.updateEmailVerificationToken(
          user.id,
          verificationToken,
          expirationDate
        );

        const profile = await userRepository.findUserProfileByUserId(user.id);

        if (profile) {
          await emailService.sendEmailVerification(
            email,
            verificationToken,
            {
              firstName: profile.firstName,
              lastName: profile.lastName
            }
          );
        } else {
          await emailService.sendEmailVerification(
            email,
            verificationToken,
            {
              firstName: "User",
              lastName: ""
            }
          );
        }
      } catch {
        // Don't expose internal errors to client
      }
    }

    return {
      success: true,
      message: "If the email address is registered, a verification email has been sent."
    };
  }
}
