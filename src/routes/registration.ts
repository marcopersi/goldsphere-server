/**
 * Enhanced User Registration API Routes
 * 
 * Handles user registration with comprehensive validation,
 * security measures, and audit logging.
 */

import express from 'express';
import { UserRegistrationServiceImpl } from '../services/user/impl/UserRegistrationServiceImpl';
import { UserRepository } from '../services/user/repository/UserRepository';
import { PasswordService } from '../services/user/impl/PasswordService';
import { TokenService } from '../services/user/impl/TokenService';
import { EmailServiceFactory } from '../services/email';

const router = express.Router();

// Lazy service creation - gets current instances for testing
function getRegistrationServices() {
  const userRepository = new UserRepository();
  const passwordService = new PasswordService();
  const tokenService = new TokenService(process.env.JWT_SECRET || 'fallback-secret');
  const emailService = EmailServiceFactory.create(
    process.env.APP_BASE_URL || 'http://localhost:8888',
    process.env.EMAIL_FROM || 'noreply@goldsphere.vault'
  );
  const registrationService = new UserRegistrationServiceImpl(
    userRepository,
    passwordService,
    tokenService,
    emailService
  );
  return { registrationService, userRepository, passwordService, tokenService, emailService };
}

/**
 * POST /api/auth/register
 * 
 * Enhanced user registration endpoint that creates a complete user profile
 * with personal information, address details, and document processing history.
 * 
 * Request Body:
 * {
 *   personalInfo: {
 *     title?: 'Herr' | 'Frau' | 'Divers' | null,
 *     firstName: string,
 *     lastName: string,
 *     birthDate: string, // YYYY-MM-DD
 *     email: string,
 *     password: string
 *   },
 *   address: {
 *     country: string,
 *     postalCode: string,
 *     city: string,
 *     state: string,
 *     street: string
 *   },
 *   consent: {
 *     agreeToTerms: boolean,
 *     termsVersion: string,
 *     consentTimestamp: string // ISO 8601
 *   },
 *   documentInfo?: {
 *     originalFilename?: string,
 *     wasProcessed?: boolean,
 *     extractedFields?: Record<string, any>
 *   }
 * }
 * 
 * Responses:
 * 201: Registration successful with user data and JWT token
 * 400: Validation error or email already exists
 * 429: Rate limit exceeded
 * 500: Internal server error
 */
router.post('/register', async (req, res) => {
  try {
    // Extract client information
    const clientInfo = {
      ipAddress: getClientIpAddress(req),
      userAgent: req.get('User-Agent') || 'Unknown',
    };

    // Call registration service
    const result = await getRegistrationServices().registrationService.registerUser(req.body, clientInfo);

    if (result.success) {
      // Set secure HTTP-only cookie for token (optional)
      res.cookie('authToken', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json(result);
    } else {
      // Determine appropriate HTTP status code based on error
      const statusCode = getErrorStatusCode(result.code);
      res.status(statusCode).json(result);
    }
  } catch (error) {
    console.error('Registration endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: {
        message: 'An unexpected error occurred during registration',
      },
    });
  }
});

/**
 * GET /api/auth/register/check-email/:email
 * 
 * Check if an email address is already registered.
 * This endpoint helps provide real-time feedback during registration.
 * 
 * Parameters:
 * - email: URL-encoded email address
 * 
 * Responses:
 * 200: { exists: boolean }
 * 400: Invalid email format
 * 500: Internal server error
 */
router.get('/register/check-email/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    
    // Basic email format validation
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        code: 'INVALID_EMAIL_FORMAT',
      });
    }

    const exists = await getRegistrationServices().registrationService.isEmailRegistered(email);
    
    res.json({ exists });
  } catch (error) {
    console.error('Email check endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * POST /api/auth/register/resend-verification
 * 
 * Resend email verification for a user.
 * This endpoint allows users to request a new verification email.
 * 
 * Request Body:
 * {
 *   email: string
 * }
 * 
 * Responses:
 * 200: Verification email sent (or user doesn't exist - for security)
 * 400: Invalid request format
 * 429: Rate limit exceeded
 * 500: Internal server error
 */
router.post('/register/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Valid email address is required',
        code: 'INVALID_EMAIL',
      });
    }

    // Always return success for security (don't reveal if email exists)
    // This prevents email enumeration attacks
    const { registrationService, userRepository, emailService } = getRegistrationServices();
    const user = await userRepository.findUserByEmail(email);
    
    if (user) {
      try {
        // Generate new verification token
        const verificationToken = await registrationService.generateEmailVerificationToken(user.id);
        
        // Update verification status with new token and expiry
        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + 24);
        
        await userRepository.updateEmailVerificationToken(
          user.id,
          verificationToken,
          expirationDate
        );

        // Get user profile for personalized email
        const profile = await userRepository.findUserProfileByUserId(user.id);
        
        // Send verification email
        if (profile) {
          await emailService.sendEmailVerification(
            email,
            verificationToken,
            {
              firstName: profile.firstName,
              lastName: profile.lastName,
            }
          );
        } else {
          await emailService.sendEmailVerification(
            email,
            verificationToken,
            {
              firstName: 'User',
              lastName: '',
            }
          );
        }
      } catch (error) {
        console.error('Error resending verification email:', error);
        // Don't expose internal errors to client
      }
    }

    // Always return success response
    res.json({
      success: true,
      message: 'If the email address is registered, a verification email has been sent.',
    });
  } catch (error) {
    console.error('Resend verification endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract client IP address from request, handling proxies and load balancers
 */
function getClientIpAddress(req: express.Request): string {
  return (
    req.ip ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection as any)?.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Map error codes to appropriate HTTP status codes
 */
function getErrorStatusCode(errorCode: string): number {
  switch (errorCode) {
    case 'VALIDATION_ERROR':
    case 'INVALID_EMAIL_FORMAT':
    case 'INVALID_PASSWORD':
    case 'INVALID_BIRTH_DATE':
    case 'INVALID_COUNTRY':
    case 'MISSING_REQUIRED_FIELD':
      return 400;
    case 'EMAIL_ALREADY_EXISTS':
      return 409; // Conflict
    case 'RATE_LIMIT_EXCEEDED':
      return 429;
    case 'INTERNAL_ERROR':
    default:
      return 500;
  }
}

/**
 * Basic email format validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export default router;
