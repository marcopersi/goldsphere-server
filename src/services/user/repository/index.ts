/**
 * Repository Module Barrel Export
 * 
 * Re-exports all repository interfaces and implementations for the User domain.
 */

// Interface
export { IUserRepository, TransactionCallback } from './IUserRepository';

// Implementations
export { UserRepositoryImpl } from './UserRepositoryImpl';
export { UserRepository } from './UserRepository';
