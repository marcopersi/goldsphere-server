/**
 * Enhanced User Registration Service Implementation
 * 
 * Main service orchestrating user registration with comprehensive
 * profile information, validation, and audit logging.
 */

import {
  IUserRegistrationService,
  IUserRepository,
  IPasswordService,
  ITokenService,
  IEmailService,
  ClientInfo,
  ValidationResult,
  ValidationError,
} from '../interfaces/IUserRegistrationService';
import {
  EnhancedRegistrationRequest,
  EnhancedRegistrationResponse,
  RegistrationErrorResponse,
  EnhancedRegistrationRequestSchema,
  ERROR_CODES,
} from '../types/registration';

export class UserRegistrationService implements IUserRegistrationService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordService: IPasswordService,
    private readonly tokenService: ITokenService,
    private readonly emailService: IEmailService
  ) {}

  async registerUser(
    registrationData: EnhancedRegistrationRequest,
    clientInfo: ClientInfo
  ): Promise<EnhancedRegistrationResponse | RegistrationErrorResponse> {
    try {
      // Step 1: Validate the registration data
      const validationResult = await this.validateRegistrationData(registrationData);
      if (!validationResult.isValid) {
        return this.createValidationErrorResponse(validationResult.errors);
      }

      // Step 2: Check if email is already registered
      const existingUser = await this.userRepository.findUserByEmail(registrationData.personalInfo.email);
      if (existingUser) {
        return this.createEmailExistsErrorResponse();
      }

      // Step 3: Hash password
      const passwordHash = await this.passwordService.hashPassword(registrationData.personalInfo.password);

      // Step 4: Execute transaction to create all records
      const result = await this.userRepository.executeTransaction(async (_client) => {
        // Create user
        const user = await this.userRepository.createUser({
          email: registrationData.personalInfo.email,
          passwordHash,
          role: 'customer',
          termsVersion: registrationData.consent.termsVersion,
          termsAcceptedAt: new Date(registrationData.consent.consentTimestamp),
        });

        // Create user profile
        const profile = await this.userRepository.createUserProfile({
          userId: user.id,
          title: registrationData.personalInfo.title,
          firstName: registrationData.personalInfo.firstName,
          lastName: registrationData.personalInfo.lastName,
          birthDate: new Date(registrationData.personalInfo.birthDate),
        });

        // Create user address
        const address = await this.userRepository.createUserAddress({
          userId: user.id,
          countryId: registrationData.address.countryId,
          postalCode: registrationData.address.postalCode,
          city: registrationData.address.city,
          state: registrationData.address.state,
          street: registrationData.address.street,
          isPrimary: true,
        });

        // Log document processing if applicable
        if (registrationData.documentInfo?.wasProcessed) {
          await this.userRepository.logDocumentProcessing({
            userId: user.id,
            originalFilename: registrationData.documentInfo.originalFilename,
            processingStatus: 'completed',
            extractedFields: registrationData.documentInfo.extractedFields,
            wasProcessed: registrationData.documentInfo.wasProcessed,
          });
        }

        // Log consent
        await this.userRepository.logConsent({
          userId: user.id,
          consentType: 'terms_and_conditions',
          consentGiven: registrationData.consent.agreeToTerms,
          termsVersion: registrationData.consent.termsVersion,
          consentTimestamp: new Date(registrationData.consent.consentTimestamp),
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent,
        });

        // Create verification status with proper token
        const actualVerificationToken = await this.tokenService.generateVerificationToken(user.id);
        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + 24); // 24 hours expiry

        await this.userRepository.createUserVerificationStatus({
          userId: user.id,
          emailVerificationToken: actualVerificationToken,
          emailVerificationExpiresAt: expirationDate,
        });

        return { user, profile, address, verificationToken: actualVerificationToken };
      });

      // Step 6: Send verification email (outside transaction to avoid rollback on email failure)
      try {
        await this.emailService.sendEmailVerification(
          result.user.email,
          result.verificationToken,
          {
            firstName: result.profile.firstname,
            lastName: result.profile.lastname,
          }
        );
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Don't fail registration if email sending fails
      }

      // Step 7: Generate JWT token
      const { token, expiresAt } = await this.tokenService.generateJwtToken(result.user, result.profile);

      // Step 8: Return success response
      return this.createSuccessResponse(result.user, result.profile, result.address, token, expiresAt);

    } catch (error) {
      console.error('User registration failed:', error);
      return this.createInternalErrorResponse();
    }
  }

  async isEmailRegistered(email: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findUserByEmail(email);
      return user !== null;
    } catch (error) {
      console.error('Error checking email registration:', error);
      throw new Error('Failed to check email registration status');
    }
  }

  async validateRegistrationData(
    registrationData: EnhancedRegistrationRequest
  ): Promise<ValidationResult> {
    try {
      // Use Zod schema validation
      const parseResult = EnhancedRegistrationRequestSchema.safeParse(registrationData);
      
      if (parseResult.success) {
        return { isValid: true, errors: [] };
      }

      // Convert Zod errors to our ValidationError format
      const errors: ValidationError[] = parseResult.error.issues.map((issue: any) => ({
        field: issue.path.join('.'),
        code: this.mapZodErrorToCode(issue.code),
        message: issue.message,
      }));

      return { isValid: false, errors };
    } catch (error) {
      console.error('Error validating registration data:', error);
      return {
        isValid: false,
        errors: [{
          field: 'unknown',
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Validation failed due to internal error',
        }],
      };
    }
  }

  async generateEmailVerificationToken(userId: string): Promise<string> {
    try {
      return await this.tokenService.generateVerificationToken(userId);
    } catch (error) {
      console.error('Error generating email verification token:', error);
      throw new Error('Failed to generate email verification token');
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private createSuccessResponse(
    user: any,
    profile: any,
    address: any,
    token: string,
    expiresAt: string
  ): EnhancedRegistrationResponse {
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: {
          title: profile.title,
          firstName: profile.firstname,
          lastName: profile.lastname,
          birthDate: profile.birthdate.toISOString().split('T')[0], // YYYY-MM-DD format
          address: {
            countryId: address.countryId,
            postalCode: address.postalcode,
            city: address.city,
            state: address.state,
            street: address.street,
          },
          createdAt: profile.createdat.toISOString(),
          verificationStatus: {
            email: 'pending',
            identity: 'pending',
          },
        },
      },
      token,
      expiresAt,
    };
  }

  private createValidationErrorResponse(errors: ValidationError[]): RegistrationErrorResponse {
    return {
      success: false,
      error: 'Validation failed',
      code: ERROR_CODES.VALIDATION_ERROR,
      details: {
        validationErrors: errors,
      },
    };
  }

  private createEmailExistsErrorResponse(): RegistrationErrorResponse {
    return {
      success: false,
      error: 'Email address already registered',
      code: ERROR_CODES.EMAIL_ALREADY_EXISTS,
      details: {
        field: 'personalInfo.email',
        message: 'An account with this email address already exists',
      },
    };
  }

  private createInternalErrorResponse(): RegistrationErrorResponse {
    return {
      success: false,
      error: 'Internal server error',
      code: ERROR_CODES.INTERNAL_ERROR,
      details: {
        message: 'An unexpected error occurred during registration. Please try again.',
      },
    };
  }

  private mapZodErrorToCode(zodCode: string): string {
    switch (zodCode) {
      case 'invalid_type':
      case 'invalid_string':
      case 'invalid_date':
        return ERROR_CODES.VALIDATION_ERROR;
      case 'too_small':
      case 'too_big':
        return ERROR_CODES.VALIDATION_ERROR;
      case 'invalid_enum_value':
        return ERROR_CODES.INVALID_COUNTRY;
      default:
        return ERROR_CODES.VALIDATION_ERROR;
    }
  }
}
