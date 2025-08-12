# GoldSphere Server - Technical Debt & Refactoring Backlog

## 🎯 **Current Status**: Ready to begin refactoring
**Last Updated**: August 12, 2025

## 📋 **Refactoring Roadmap**

### **Phase 1: Foundation (HIGH PRIORITY)**
Status: 🔄 **READY TO START**

#### 1.1 Business Logic Separation
- **Priority**: HIGH
- **Status**: 📋 **PLANNED**
- **Effort**: 3-4 days
- **Dependencies**: None
- **Description**: Extract business logic from route handlers into dedicated service layers
- **Target Structure**:
  ```
  src/services/
  ├── OrderService.ts      // Order creation, validation, enrichment
  ├── PortfolioService.ts  // Portfolio management, auto-creation  
  ├── ProductService.ts    // Product queries, enrichment
  ├── UserService.ts       // User management
  └── CalculationService.ts // Fee, tax, price calculations
  ```
- **Benefits**: Testable business logic, reusable across routes, cleaner separation of concerns
- **Files to Refactor**: `orders.ts`, `portfolio.ts`, `products.ts`, `users.ts`

#### 1.2 Database Transaction Management
- **Priority**: HIGH
- **Status**: 📋 **PLANNED**
- **Effort**: 2-3 days
- **Dependencies**: Business Logic Separation (partial)
- **Description**: Implement proper transaction handling for multi-step operations
- **Critical Areas**: Order creation with portfolio auto-creation, payment processing
- **Implementation**: Transaction wrapper service with rollback capabilities
- **Benefits**: Data consistency, rollback on failures, safer multi-step operations

### **Phase 2: Architecture (MEDIUM PRIORITY)**
Status: ⏳ **WAITING**

#### 2.1 Authentication Middleware Consolidation
- **Priority**: MEDIUM
- **Status**: 📋 **PLANNED**
- **Effort**: 1-2 days
- **Dependencies**: Business Logic Separation
- **Description**: Consolidate duplicate auth middleware implementations
- **Current Issue**: Two separate auth files causing inconsistency
- **Target**: Single advanced auth middleware with role-based access
- **Files to Update**: Remove `authMiddleware.ts`, update all route imports

#### 2.2 Database Query Abstraction
- **Priority**: MEDIUM
- **Status**: 📋 **PLANNED**
- **Effort**: 4-5 days
- **Dependencies**: Business Logic Separation, Transaction Management
- **Description**: Create repository pattern for database operations
- **Target Structure**:
  ```
  src/repositories/
  ├── UserRepository.ts
  ├── ProductRepository.ts
  ├── OrderRepository.ts
  └── PortfolioRepository.ts
  ```
- **Benefits**: Centralized database logic, type-safe queries, easier testing

#### 2.3 Error Handling Standardization  
- **Priority**: MEDIUM
- **Status**: 📋 **PLANNED**
- **Effort**: 2-3 days
- **Dependencies**: Service Layer Implementation
- **Description**: Implement consistent error responses and centralized error middleware
- **Current Issue**: Inconsistent error formats across routes
- **Target**: Global error handler middleware with standardized error types

### **Phase 3: Quality of Life (LOW PRIORITY)**
Status: ⏳ **WAITING**

#### 3.1 Configuration Management
- **Priority**: LOW
- **Status**: 📋 **PLANNED**
- **Effort**: 1-2 days
- **Dependencies**: None (can be done in parallel)
- **Description**: Centralize configuration and eliminate hardcoded values
- **Target Structure**:
  ```
  src/config/
  ├── database.ts
  ├── auth.ts
  ├── business.ts  // Fee rates, tax rates
  └── index.ts
  ```

## 📊 **Progress Tracking**

### **Completed**
- ✅ Order API Correction (Frontend-minimal requests with JWT userId extraction)
- ✅ Test Script Organization (Consolidated to 3 focused tests in scripts/test/)
- ✅ Code Review and Cleanup (Removed redundant files and documentation)

### **In Progress**
- 🔄 **STARTING NEXT**: Business Logic Separation

### **Blocked/Waiting**
- ⏳ All Phase 2 & 3 items (waiting for Phase 1 completion)

## 🎯 **Next Action Items**

### **Immediate (Today)**
1. Create new branch `refactor/business-logic-separation`
2. Start with OrderService extraction
3. Implement CalculationService for fee/tax calculations

### **This Week**
1. Complete OrderService and CalculationService
2. Extract PortfolioService 
3. Begin ProductService extraction

### **Next Week**
1. Complete all service layer extractions
2. Begin transaction management implementation
3. Update all route handlers to use services

## 📝 **Technical Debt Metrics**

### **Current Issues Tracked**
- Raw SQL queries in routes: **14 files affected**
- Duplicate auth middleware: **2 implementations**
- Hardcoded business values: **5+ locations**
- No transaction management: **3 critical workflows**
- Inconsistent error formats: **All route files**

### **Risk Assessment**
- **Data Integrity Risk**: HIGH (no transactions)
- **Security Risk**: MEDIUM (inconsistent auth)
- **Maintainability Risk**: HIGH (mixed concerns)
- **Testing Risk**: HIGH (untestable business logic)

## 🔧 **Refactoring Guidelines**

### **Service Layer Principles**
1. **Single Responsibility**: Each service handles one domain
2. **Dependency Injection**: Services receive dependencies via constructor
3. **Interface Contracts**: Define clear interfaces for all services
4. **Error Handling**: Services throw typed business errors
5. **Transaction Awareness**: Services accept optional transaction clients

### **Migration Strategy**
1. **Gradual**: Refactor one service at a time
2. **Backward Compatible**: Keep existing routes working during transition
3. **Test Coverage**: Add unit tests for each new service
4. **Integration Tests**: Ensure end-to-end functionality remains intact

## 💡 **Success Criteria**

### **Phase 1 Complete When**
- [ ] All business logic extracted from route handlers
- [ ] Services have comprehensive unit tests  
- [ ] All multi-step operations use transactions
- [ ] Integration tests pass
- [ ] Performance benchmarks maintained

### **Overall Project Complete When**
- [ ] Zero raw SQL in route handlers
- [ ] Single auth middleware implementation
- [ ] Consistent error responses across all endpoints
- [ ] All configuration externalized
- [ ] Technical debt metrics show significant improvement

---

**Notes**: This backlog will be updated as we progress through each phase. Each completed item should be marked with completion date and any lessons learned.
