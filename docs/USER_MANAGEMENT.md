# User Management Implementation Plan

**Status:** In Progress  
**Start Date:** 2026-01-15  
**Owner:** Backend Team

---

## 📋 Executive Summary

Implementation of comprehensive user management features including:
- User account status management (active, blocked, suspended, deleted)
- User blocking/unblocking functionality
- Soft-delete capability with audit trail
- Extended user profile fields (phone, gender, currency, language)
- Admin endpoints for user management

---

## 🎯 Current State Analysis

### ✅ What Already Exists

**Database Schema:**
- `users` table with email, passwordHash, role, email_verified, identity_verified
- `user_profiles` table with title, first_name, last_name, birth_date
- `user_addresses` table with full address information
- `user_verification_status` table for verification tracking
- `consent_log` table for GDPR compliance
- `document_processing_log` table for AI form filling

**Services:**
- `UserRegistrationServiceImpl` - Complete registration flow
- `UserServiceImpl` - CRUD operations including deleteUser()
- `UserRepository` - Database operations
- `PasswordService` - Password hashing/validation
- `TokenService` - JWT token generation
- `EmailService` - Email verification

**API Endpoints:**
- `POST /api/auth/register` - Fully implemented registration

### ❌ What's Missing

**Database:**
- No `account_status` field (active, blocked, suspended, deleted)
- Missing: phone_number, gender, preferred_currency, preferred_language
- No block tracking (blocked_at, blocked_by, block_reason)

**Services:**
- No blockUser() functionality
- No unblockUser() functionality
- No softDeleteUser() with audit trail
- No user preferences update

**API Endpoints:**
- PUT /api/users/:id/block - Block user
- PUT /api/users/:id/unblock - Unblock user
- DELETE /api/users/:id - Delete user (soft delete)
- GET /api/users/:id - Get user details
- PATCH /api/users/:id - Update user data
- PATCH /api/users/:id/profile - Update user profile

---

## 🏗️ Implementation Phases

### Phase 1: Database Schema Extensions ✅ READY TO START

**File:** `/initdb/08-user-account-status.sql`

**Tasks:**
- Create `account_status` ENUM type
- Add account_status, blocked_at, blocked_by, block_reason to users table
- Add phone_number, gender, preferred_currency_id, preferred_language to users table
- Create indexes for performance
- Add migration comments

**Acceptance Criteria:**
- [ ] SQL file executes without errors
- [ ] All new columns have correct types and constraints
- [ ] Indexes created successfully
- [ ] Existing data remains intact

### Phase 2: Type Definitions

**Files:**
- `/src/services/user/types/UserTypes.ts`

**Tasks:**
- Add AccountStatus enum
- Add gender enum
- Extend UserEntity interface with new fields
- Create BlockUserInput interface
- Create UserPreferences interface
- Create UpdateProfileInput interface

**Acceptance Criteria:**
- [ ] All types exported correctly
- [ ] No TypeScript compilation errors
- [ ] Types match database schema

### Phase 3: Repository Layer

**Files:**
- `/src/services/user/repository/IUserRepository.ts`
- `/src/services/user/repository/UserRepositoryImpl.ts`

**Tasks:**
- Add blockUser() method signature and implementation
- Add unblockUser() method signature and implementation
- Add softDeleteUser() method signature and implementation
- Add updateUserPreferences() method
- Add findBlockedUsers() query method

**Acceptance Criteria:**
- [ ] All methods properly typed
- [ ] SQL queries use parameterized statements
- [ ] Proper error handling
- [ ] Database transactions where needed

### Phase 4: Service Layer

**Files:**
- `/src/services/user/service/IUserService.ts`
- `/src/services/user/service/UserServiceImpl.ts`

**Tasks:**
- Add blockUser() with admin check
- Add unblockUser() with admin check
- Add softDeleteUser() with dependencies check
- Add updateUserProfile() with validation
- Add business logic for account status transitions

**Acceptance Criteria:**
- [ ] Admin authorization enforced
- [ ] Input validation performed
- [ ] Proper error codes returned
- [ ] Audit trail logged
- [ ] No ESLint errors

### Phase 5: API Routes

**File:** `/src/routes/users.ts`

**Tasks:**
- PUT /api/users/:id/block (Admin only)
- PUT /api/users/:id/unblock (Admin only)
- DELETE /api/users/:id (Admin only, soft delete)
- GET /api/users/:id
- PATCH /api/users/:id
- PATCH /api/users/:id/profile
- Add authentication middleware
- Add admin authorization checks

**Acceptance Criteria:**
- [ ] All endpoints properly secured
- [ ] Request validation implemented
- [ ] Proper HTTP status codes
- [ ] Error responses standardized
- [ ] Routes registered in app.ts

### Phase 6: Swagger Documentation

**File:** `/src/routes/users.ts`

**Tasks:**
- Document all new endpoints
- Add request/response schemas
- Add authentication requirements
- Add example requests/responses

**Acceptance Criteria:**
- [ ] All endpoints documented
- [ ] Swagger UI renders correctly
- [ ] Examples are accurate

### Phase 7: Testing

**File:** `/scripts/test-user-management.sh`

**Tasks:**
- Create comprehensive curl test script
- Test block user → login should fail
- Test unblock user → login should succeed
- Test soft delete → user should be marked deleted
- Test admin authorization
- Test validation errors

**Acceptance Criteria:**
- [ ] All tests pass
- [ ] Script is executable
- [ ] Clear test output
- [ ] Both positive and negative cases covered

### Phase 8: Integration & Validation

**Tasks:**
- Run npm run build
- Run npm run lint
- Run existing tests
- Manual testing via Swagger UI
- Update related documentation

**Acceptance Criteria:**
- [ ] No build errors
- [ ] No lint errors
- [ ] All tests passing
- [ ] Manual testing successful

---

## 🔒 Security Considerations

**Critical:**
- Only admins can block/unblock/delete users
- JWT token validation on all protected routes
- Rate limiting on sensitive endpoints
- Audit trail for all user status changes
- Soft-delete preserves data for audit

**Payment Methods:**
- ⚠️ Credit card data MUST NOT be stored in database
- ✅ Use Stripe Payment Methods API for card storage
- ✅ Store only Stripe customer_id and payment_method_id

---

## 📊 Success Metrics

- [ ] All phases completed
- [ ] Zero ESLint errors
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Code review approved
- [ ] Manual testing successful

---

## 🚧 Known Limitations & Future Work

**Phase 1 Scope:**
- Does not include password reset functionality
- Does not include email change workflow
- Does not include 2FA implementation
- Payment methods managed via Stripe API (separate implementation)

**Future Enhancements:**
- Account suspension with auto-unblock timer
- User activity logging
- Admin dashboard for user management
- Bulk user operations

---

## 📝 Notes

**Database Migration:**
- New SQL file will be executed automatically on next DB initialization
- For existing deployments, run migration script manually
- Backup database before running migrations

**Testing Strategy:**
- Unit tests for service layer
- Integration tests for API endpoints
- Manual testing for complex workflows

**Rollback Plan:**
- Keep backup of database schema
- Document rollback SQL statements
- Test rollback procedure in staging

---

**Last Updated:** 2026-01-15  
**Next Review:** After Phase 4 completion
