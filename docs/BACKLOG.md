# GoldSphere Server - Development Backlog

## CRITICAL SECURITY ISSUES (URGENT - MUST FIX IMMEDIATELY)

### Authentication Security Holes
- [x] **[Critical] JWT Authentication Security Hole**: token validation now verifies user existence, active account status, and role consistency against database (including tsoa protected routes)
  - **Risk**: Deleted users can still access APIs with valid tokens
  - **Risk**: Role changes not reflected (old tokens with old roles still work)
  - **Risk**: Database inconsistency between token data and reality
  - **Fix**: Add database lookup to verify user exists and current role matches token
- [ ] **Token Revocation System**: No way to revoke/blacklist tokens when users are deleted/suspended
- [ ] **Session Management**: No proper session management or token refresh mechanism
- [ ] **Password Change Token Invalidation**: Changing password should invalidate all existing tokens
- [ ] **Account Lockout**: No protection against brute force attacks
- [ ] **Rate Limiting per User**: Current rate limiting is global, not per-user
- [ ] **Audit Logging**: No security audit trail for authentication events

### Database Security
- [ ] **SQL Injection Review**: Comprehensive audit of all SQL queries for injection vulnerabilities
- [ ] **Database Connection Security**: Review connection strings and access patterns
- [ ] **Sensitive Data Exposure**: Review what data is returned in API responses
- [ ] **Database User Privileges**: Ensure database users have minimal required privileges

### API Security
- [ ] **Input Validation**: Comprehensive input sanitization and validation
- [ ] **Output Encoding**: Prevent XSS and data leakage in responses
- [ ] **CORS Configuration**: Review and harden CORS settings for production
- [ ] **Content Security Policy**: Add CSP headers
- [ ] **Security Headers**: Add comprehensive security headers (HSTS, X-Frame-Options, etc.)

---

## Enhanced User Registration Refactoring (HIGH PRIORITY)

### Database Schema Improvements
- [ ] **Merge user tables**: Integrate `username`, `email`, `passwordhash` from `users` table into `user_profiles`
- [ ] **Add citizenship/birth country**: Add `birthCountry` and `citizenship` fields to user profile
- [ ] **Add user currency preference**: Add `preferredCurrency` field for user's "thinking currency"
- [ ] **Rename to camelCase**: Convert all table names and column names from snake_case to camelCase
  - `user_profiles` -> `userProfiles`
  - `user_addresses` -> `userAddresses`
  - `user_verification_status` -> `userVerificationStatus`
  - `user_consent_log` -> `userConsentLog`
  - `user_document_info` -> `userDocumentInfo`
  - All column names: `first_name` -> `firstName`, `last_name` -> `lastName`, etc.
- [ ] **Rename final table**: `user_profiles` -> `users` (main user table)

### TypeScript Type System & References API
- [ ] **Create Title enum**: `Title` enum (`Herr`, `Frau`, `Divers`) with References API endpoint
- [ ] **Create Role enum**: `UserRole` enum (`customer`, `admin`, `user`) with References API endpoint  
- [ ] **Create ProcessingStatus enum**: Expand to meaningful statuses (`applied`, `processing`, `completed`, `rejected`) with References API endpoint
- [ ] **Create EmailVerificationStatus enum**: With References API endpoint
- [ ] **Create IdentityVerificationStatus enum**: With References API endpoint
- [ ] **Update References API**: Add new endpoints for all enums
  - `GET /api/references/titles`
  - `GET /api/references/user-roles` 
  - `GET /api/references/processing-statuses`
  - `GET /api/references/email-verification-statuses`
  - `GET /api/references/identity-verification-statuses`

### Code Quality
- [ ] **Remove single-value enums**: Fix `processing_status` to have multiple meaningful values
- [ ] **Update validation schemas**: Update all Zod schemas to use new enums and field names
- [ ] **Update repository layer**: Refactor UserRepository to work with new schema
- [ ] **Update service layer**: Update UserRegistrationService for new structure
- [ ] **Update integration tests**: Fix all tests to work with refactored schema
- [ ] **Update contract tests**: Ensure all endpoints work with new structure

### Migration Strategy
- [ ] **Create migration script**: Safe migration from current schema to new schema
- [ ] **Data preservation**: Ensure no data loss during migration
- [ ] **Rollback plan**: Create rollback strategy if needed

---

## User Service Refactor & Type Safety (HIGH PRIORITY)

### Repository Structure & Size Limits
- [ ] **Split UserRepository**: Main file <300 lines; move mappers to `UserRepositoryMappers.ts`; move DB row interfaces to `UserRepositoryTypes.ts`
- [ ] **Reuse shared pieces**: Update `UserRepositoryMock.ts` to consume shared types/mappers

### Type Safety Cleanup
- [ ] **Remove `any` hotspots**: Replace `any` in `TokenService.verifyJwtToken`, `UserRegistrationService` (e.g., `issue` -> `z.ZodIssue`), `errorResponse.ts`, and remaining user-service files
- [ ] **Consistency pass**: Grep remaining `any` in user service and replace with specific types or discriminated unions

### Quality Gates
- [ ] **ESLint/Warnings**: Reduce warnings to <50 and ensure 0 ESLint errors
- [ ] **Tests**: Unit + integration suite stay green after refactor; lint passes

---

## API Consistency & Type Safety (MEDIUM PRIORITY)

### OrderSource Enum Implementation
- [ ] **OrderSource Tracking**: Implement OrderSource enum from @marcopersi/shared
  - **Purpose**: Track order creation source (Web, Mobile, Admin, API)
  - **Database**: Add `source VARCHAR(20) DEFAULT 'web'` column to orders table
  - **Migration**: Create migration script for existing orders
  - **Code Changes**:
    - Import OrderSource from @marcopersi/shared
    - Update Order interface to include source field
    - Update CREATE order requests to accept source
    - Update GET order responses to include source
    - Add validation for source values
  - **Tests**: Update integration tests for order source
  - **Estimated Effort**: 2-3 hours
  - **Benefits**: Better analytics, security (detect suspicious order sources), debugging

---

## CRITICAL ISSUES IDENTIFIED IN CODE REVIEW (URGENT)

### Database Schema Inconsistencies & Hardcoded Values
- [ ] **[Critical] Hardcoded Country Validation in Registration**: `registration.ts` contains hardcoded list of country codes instead of using database/API
  - **Issue**: Hardcoded array `VALID_COUNTRY_CODES` bypasses database integrity
  - **Risk**: Country codes can become stale, mismatch with database reality
  - **Fix**: Replace with dynamic validation against country table or remove validation
  - **Location**: `src/types/registration.ts` lines 186-200
- [ ] **Schema Validation Mismatch**: Different field names between database and validation schemas
  - **Issue**: `countryId` vs various country field naming inconsistencies
  - **Risk**: Runtime validation errors, data corruption
  - **Fix**: Standardize field naming across all schemas and database
- [ ] **Missing Error Boundary Protection**: No global error handling for schema validation failures
  - **Risk**: Unhandled exceptions can crash server
  - **Fix**: Add comprehensive error boundary middleware

### Audit Trail Implementation Gaps
- [ ] **[Critical] Inconsistent Audit Trail Usage**: Some operations use audit trail, others don't
  - **Issue**: OrderService optionally accepts audit user, but many calls don't provide it
  - **Risk**: Incomplete audit trail, compliance issues
  - **Fix**: Make audit trail mandatory for all operations or have clear fallback strategy
  - **Affected**: Order creation, position updates, producer changes
- [ ] **Missing Audit Trail for Critical Operations**: Producer updates, product changes lack audit
  - **Risk**: No accountability for business-critical data changes
  - **Fix**: Implement audit trail for all CRUD operations
- [ ] **Audit Trail Schema Design**: Current implementation mixes optional and required audit
  - **Issue**: Overloaded method signatures, unclear when audit is required
  - **Fix**: Consistent pattern - either always audit or clear separation

### Test Infrastructure Problems
- [ ] **Test Database Naming Conflicts**: Tests may interfere with each other
  - **Issue**: Test database names use timestamp but could still conflict
  - **Risk**: Flaky tests, data corruption between test runs
  - **Fix**: Add process ID to test database names, better cleanup
- [ ] **Missing Test Coverage for Edge Cases**: Shared package integration edge cases
  - **Issue**: Limited testing of schema validation edge cases
  - **Risk**: Production validation failures
  - **Fix**: Add comprehensive schema validation tests

### Performance & Resource Issues
- [ ] **Database Connection Pool Sizing**: Pool configuration not tuned for test vs production
  - **Issue**: Fixed pool size may not be optimal for different environments
  - **Risk**: Connection exhaustion, poor performance
  - **Fix**: Environment-specific pool configuration
- [ ] **Memory Leaks in Test Suite**: Test database pools may not be properly cleaned up
  - **Issue**: Jest warning about operations after test completion
  - **Risk**: Memory leaks, CI/CD resource exhaustion
  - **Fix**: Proper async cleanup in test teardown

---

## Other Security & Quality Issues Identified

### Authentication & Authorization
- [ ] **Hardcoded Credentials**: Remove hardcoded credentials from code/configs
- [ ] **Environment Variable Security**: Secure handling of sensitive environment variables
- [ ] **JWT Secret Rotation**: Implement JWT secret rotation strategy
- [ ] **Multi-Factor Authentication**: Add 2FA support for admin accounts
- [ ] **OAuth Integration**: Consider OAuth2/OIDC integration for enterprise users

### API Vulnerabilities
- [ ] **Mass Assignment Protection**: Prevent mass assignment vulnerabilities in user updates
- [ ] **File Upload Security**: Secure file upload handling with virus scanning
- [ ] **API Versioning Security**: Ensure deprecated API versions are properly secured/disabled
- [ ] **Error Information Leakage**: Review error messages to prevent information disclosure

### Database & Data Security
- [ ] **Encryption at Rest**: Implement database encryption for sensitive data
- [ ] **PII Data Handling**: Proper handling and protection of Personally Identifiable Information
- [ ] **Data Retention Policies**: Implement data retention and deletion policies
- [ ] **Backup Security**: Secure database backup and recovery procedures

---

## Other Backlog Items (MEDIUM/LOW PRIORITY)

### Performance & Optimization
- [ ] **Database indexing**: Review and optimize database indexes
- [ ] **Query optimization**: Optimize slow queries identified during testing
- [ ] **Connection pooling**: Fine-tune PostgreSQL connection pool settings
- [ ] **Caching Strategy**: Implement Redis caching for frequently accessed data

### API Enhancements  
- [ ] **API versioning**: Implement proper API versioning strategy
- [ ] **Response pagination**: Add pagination to list endpoints
- [ ] **Bulk operations**: Add bulk endpoints for efficiency
- [ ] **GraphQL Support**: Consider GraphQL API for complex queries

### Testing & Quality
- [ ] **Security Testing**: Penetration testing and vulnerability assessment
- [ ] **Load testing**: Performance testing with realistic load
- [ ] **E2E testing**: End-to-end testing with frontend integration
- [ ] **Monitoring**: Add application monitoring and alerting
- [ ] **Code Coverage**: Increase test coverage to 100%

### Code Architecture Improvements
- [ ] **Service Layer Refactoring**: Separate business logic from route handlers
  - **Current Issue**: Business logic mixed into route handlers (e.g., products.ts)
  - **Goal**: Create clean Service Layer with interfaces and dependency injection
  - **Priority**: Medium - improves maintainability and testability
  - **Affected Areas**: Products, Orders, Users, Portfolio management
  - **Pattern**: Interface -> Service Implementation -> Repository -> Database
- [ ] **Repository Pattern**: Extract database operations into repository classes
- [ ] **Dependency Injection**: Implement proper DI container for better testing
- [ ] **Error Handling Middleware**: Centralized error handling and logging
- [ ] **Validation Middleware**: Extract validation logic into reusable middleware

### Documentation & Compliance
- [ ] **Security Documentation**: Document security policies and procedures
- [ ] **API documentation**: Complete OpenAPI/Swagger documentation
- [ ] **Database schema documentation**: Document all tables and relationships
- [ ] **Deployment guide**: Production deployment documentation
- [ ] **Development guide**: Onboarding guide for new developers
- [ ] **GDPR Compliance**: Ensure GDPR compliance for EU users

---

## Completed Items
- [x] **Pool replacement infrastructure**: Database isolation for tests
- [x] **Registration API implementation**: Basic registration functionality  
- [x] **100% test coverage**: All integration, unit, and contract tests passing
- [x] **Database restoration**: Fixed missing goldsphere database after tests
- [x] **Docker setup**: PostgreSQL and PgAdmin containers working
- [x] **Zod validation**: Fixed schema type mismatches
- [x] **JWT authentication**: Secure token generation and validation
