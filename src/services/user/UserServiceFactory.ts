/**
 * User Service Factory
 * 
 * Creates User service instances with proper dependency injection
 */

import { Pool } from 'pg';
import { IUserRegistrationService, IPasswordService, ITokenService, IRegistrationRepository, IEmailService } from './IRegistrationService';
import { UserRegistrationServiceImpl } from './impl/UserRegistrationServiceImpl';
import { UserRepository } from './repository/UserRepository';
import { UserRepositoryMock } from './mock/UserRepositoryMock';
import { PasswordService } from './impl/PasswordService';
import { TokenService } from './impl/TokenService';
import { IUserService } from './service/IUserService';
import { UserServiceImpl } from './service/UserServiceImpl';
import { IUserRepository } from './repository/IUserRepository';
import { UserRepositoryImpl } from './repository/UserRepositoryImpl';

export class UserServiceFactory {
  /**
   * Create production User Registration service with PostgreSQL
   */
  static createRegistrationService(pool: Pool, emailService: IEmailService): IUserRegistrationService {
    const repository = this.createLegacyRepository();
    const passwordService = this.createPasswordService();
    const tokenService = this.createTokenService();

    return new UserRegistrationServiceImpl(
      repository,
      passwordService,
      tokenService,
      emailService
    );
  }

  /**
   * Create production User service with PostgreSQL
   */
  static createUserService(pool: Pool): IUserService {
    const repository = this.createUserRepository(pool);
    return new UserServiceImpl(repository);
  }

  /**
   * Create mock User Registration service for testing
   */
  static createRegistrationServiceMock(emailService: IEmailService): IUserRegistrationService {
    const repository = this.createRepositoryMock();
    const passwordService = this.createPasswordService();
    const tokenService = this.createTokenService();

    return new UserRegistrationServiceImpl(
      repository,
      passwordService,
      tokenService,
      emailService
    );
  }

  /**
   * Create new User repository with DI (PostgreSQL)
   */
  static createUserRepository(pool: Pool): IUserRepository {
    return new UserRepositoryImpl(pool);
  }

  /**
   * Create legacy User repository (uses getPool() internally)
   */
  static createLegacyRepository(): IRegistrationRepository {
    return new UserRepository();
  }

  /**
   * Create mock User repository for testing
   */
  static createRepositoryMock(): IRegistrationRepository {
    return new UserRepositoryMock();
  }

  /**
   * Create Password service (stateless, no DI needed)
   */
  static createPasswordService(): IPasswordService {
    return new PasswordService();
  }

  /**
   * Create Token service (stateless, uses environment config)
   */
  static createTokenService(): ITokenService {
    const jwtSecret = process.env.JWT_SECRET || 'default-secret-for-testing';
    const jwtExpirationTime = process.env.JWT_EXPIRATION || '24h';
    return new TokenService(jwtSecret, jwtExpirationTime);
  }
}
