/**
 * Auth Service Factory
 * Creates AuthService with proper dependency injection
 */

import { Pool } from 'pg';
import { getPool } from '../../dbConfig';
import { IAuthService } from './IAuthService';
import { AuthServiceImpl } from './impl/AuthServiceImpl';
import { AuthRepositoryImpl } from './repository/AuthRepositoryImpl';
import { AuthRepositoryMock } from './mock/AuthRepositoryMock';
import { AuthUserRecord } from './types';

export class AuthServiceFactory {
  /**
   * Create production AuthService with PostgreSQL repository
   */
  static create(pool?: Pool): IAuthService {
    const dbPool = pool || getPool();
    const repository = new AuthRepositoryImpl(dbPool);
    return new AuthServiceImpl(repository);
  }

  /**
   * Create test AuthService with mock repository
   */
  static createForTesting(mockUsers?: AuthUserRecord[]): {
    service: IAuthService;
    mockRepository: AuthRepositoryMock;
  } {
    const mockRepository = new AuthRepositoryMock(mockUsers);
    const service = new AuthServiceImpl(mockRepository);
    return { service, mockRepository };
  }
}
