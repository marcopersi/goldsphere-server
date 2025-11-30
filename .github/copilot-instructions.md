## Quick orientation for AI coding agents

This file contains focused, discoverable knowledge to help an AI agent be productive in the goldsphere repo.

### Communication and Documentation Style (CRITICAL)

**ALWAYS follow these language rules:**

- ✅ User communication: **German, informal "Du" form** (e.g., "Verstanden!", "Ich erstelle...", "Brauchst du...?")
- ✅ Code documentation: **English** (docstrings, comments, README files)
- ✅ Commit messages: **English** (conventional commits format)
- ✅ Technical docs: **English** (architecture docs, API specs)
- ❌ NEVER mix languages inappropriately (German code comments, English user responses)

## Documentation Policy (CRITICAL)

**ALL documentation MUST be centralized in `/docs` directory:**

✅ **DO:**

- Add all technical documentation to `/docs/` directory
- Update existing `/docs/*.md` files when implementing features
- Reference `/docs` files in code comments (e.g., `// See docs/BACKEND.md for architecture`)
- Keep `/docs/README.md` as central index with links to all docs

❌ **DON'T:**

- Create README.md files scattered throughout the codebase
- Write extensive documentation in random locations
- Duplicate information across multiple files
- Create `docs/` folders in subdirectories

**When to update documentation:**

1. **New architecture patterns** → Update `docs/ARCHITECTURE.md` or `docs/BACKEND.md`
2. **New test types** → Update `docs/TESTING.md`
3. **New environment variables** → Update `docs/ENV_CONFIG.md`
4. **New service layer patterns** → Update `docs/FRONTEND.md` or `docs/BACKEND.md`
5. **New repository patterns** → Update `docs/FRONTEND.md` or `docs/BACKEND.md`
6. **CI/CD pipeline changes** → Update `docs/CI_CD.md`
7. **Docker or deployment changes** → Update `docs/CI_CD.md`
8. **Feature implementation** → Add brief note to relevant `/docs` file

**Exceptions (minimal README files allowed):**

- ✅ `README.md` in project root (project overview, quick start)
- ✅ `backend/README.md` (setup instructions)
- ✅ `src/services/instruments/README.md` (example of clean architecture)
- ✅ `.zap/README.md` (OWASP ZAP configuration)
- ❌ NO other README files without explicit approval

**After implementing a feature, ALWAYS ask:**

> "Soll ich die Dokumentation in `/docs/[RELEVANT_FILE].md` aktualisieren?"

## Critical Rules (Non-Negotiable)

❌ **Never do this:**

- Files > 300 lines
- Unhandled promise rejections
- ESLint errors
- Code duplication
- Fallbacks that hide root errors
- Create README files outside approved locations
- Features that aren't currently needed (YAGNI)
- Complex solutions when simple ones work (KISS)
- Commit on your own decision
- Drop/reset the database on your own decision
- Commit temporary files (.backup, .old files)
- **Make changes before understanding the root cause**
- **NEVER COMMIT OR PUSH WHEN TESTS ARE FAILING** (This is critical and non-negotiable!)

✅ **Always do this:**

- Extract shared code
- Handle all errors explicitly
- Log errors with context using logger utility
- Use TypeScript strictly
- Follow existing patterns
- Keep it simple (KISS)
- Build only what's needed now (YAGNI)
- **Ask if you are unsure**
- **Run all relevant tests BEFORE committing** (unit tests minimum, integration tests when touching batch/import logic)
- **Fix ALL failing tests before any commit** - zero tolerance for broken tests
- **Wait for explicit user approval before committing**

## Development Environment (CRITICAL - MEMORIZE THIS!)

## Debugging Workflow (CRITICAL - READ THIS WHEN TESTS FAIL)

When encountering errors or failing tests, follow this systematic approach:

### 1. STOP and ANALYZE First

❌ **DON'T immediately:**

- Make changes to fix what you _think_ is the problem
- Refactor code or add new fixtures
- Change multiple files at once
- Assume you know the root cause

✅ **DO first:**

- Read the **complete error message** carefully
- Identify the **exact line** where the error occurs
- Understand **what the code is trying to do** at that point
- Check if it's a **simple issue** (typo, wrong import, missing file)

### 2. Investigate Systematically

**For failing tests:**

1. Read the test code to understand what it expects
2. Check if imports are correct (especially after refactoring)
3. Verify that required files/fixtures exist
4. Check if environment variables are set
5. Look for recent changes that might have broken it

**For import errors:**

1. Check the import statement in the failing file
2. Verify the actual file location
3. Check if the import path matches the new structure
4. Look for similar imports that work correctly

**For environment/config errors:**

1. Check if `.env` or `.env.local` exists
2. Verify required variables are set
3. Check if the code can actually find/load the config
4. Test with minimal example first

### 3. Fix the Real Problem

- Make **the smallest change** that fixes the actual root cause
- Fix **one thing at a time**
- Test after each change
- Don't refactor while fixing bugs

### 4. Example: Test Failure Debugging

**Bad Approach (what NOT to do):**

```
Error: "DB_URL not found"
→ Immediately add autouse fixture to conftest.py
→ Changes affect all tests
→ Still doesn't work because real issue was wrong import
```

**Good Approach (what TO do):**

```
Error: "DB_URL not found"
→ Read full error + stack trace
→ See error comes from BaseBatch.__init__()
→ Check how BaseBatch loads .env
→ Verify .env.local exists and has DB_URL
→ Check test file imports: "from base_batch import" (wrong!)
→ Test passes ✓
```

### 5. Ask Before Major Changes

If the fix requires:

- Changing multiple files
- Adding new infrastructure (fixtures, configs, etc.)
- Refactoring existing code
- Modifying test setup for all tests

→ **STOP and ask the user first!**

## Code Quality Standards (CRITICAL)

### 1. No Redundancy (DRY Principle)

- Extract common code into reusable components, functions, or services
- Systematically search for duplicated code blocks before implementing
- Never copy-paste similar code - refactor into shared utilities
- Use composition over duplication
- Use composition over inheritance

### 2. Clean Code Principles

- Use descriptive, meaningful names for variables, functions, and components
- No magic numbers or strings - use named constants
- Functions should be self-documenting
- Keep functions small and focused

### 3. TypeScript Best Practices

- Strict typing always - avoid `any` except when absolutely necessary
- Define interfaces for complex data structures
- Use type inference where appropriate
- Prefer interfaces over types for object shapes
- Use union types and discriminated unions effectively

### 4. Performance

- Avoid unnecessary re-renders in React components
- Use memoization (useMemo, useCallback) appropriately
- Optimize data structures for the access patterns used
- Consider lazy loading for large components

### 5. Consistency

- Follow existing code patterns in the project
- Use the same solution for the same type of problem
- Maintain consistent naming conventions across the codebase
- Follow the established project structure

### 6. Design Patterns (GoF)

- Apply Gang of Four patterns where appropriate:
  - Factory Pattern for object creation
  - Strategy Pattern for algorithms
  - Observer Pattern for event handling
  - Repository Pattern for data access
  - Builder Pattern for complex object construction
- Choose patterns that simplify, not complicate

### 7. Repository Pattern (MANDATORY)

- **ALL database access MUST go through repositories** (no direct db calls in services)
- Abstract all data access through repository services
- Separate business logic from data access logic
- Provide uniform interface for data operations
- Example: `portfolioService`, `instrumentService`
- Keep repositories in `/src/services/infrastructure/repository/` or `backend/repositories/`

**See:** [docs/FRONTEND.md](../docs/FRONTEND.md) - Repository Pattern section

### 8. File Size Limits

- **Maximum 300 lines of code per file**
- If a file exceeds 300 lines, split it into smaller, logical modules
- Separate concerns into different files
- Use barrel exports (index.ts) to maintain clean imports
- Maintain interfaces and types in separate files from the rest of the code

### 9. Robust Code

- Comprehensive error handling with try-catch blocks
- Validate all inputs and user data
- Use defensive programming techniques
- Implement graceful degradation when features fail
- Log errors with context for debugging

### 10. Resilient Code

- Handle failures from external dependencies gracefully
- Implement retry mechanisms for transient failures
- **CRITICAL: Never use fallbacks that hide root errors**
- Errors must remain visible and loggable
- All promises must have error handlers - no unhandled rejections
- Use circuit breaker pattern for external services when appropriate

### 11. Code Quality (Zero Tolerance)

- **No ESLint errors allowed**
- Fix all TypeScript compiler warnings
- Maintain consistent code formatting (Prettier)
- Run linter before committing
- All code must pass CI/CD checks
- No unused imports accepted

### 12. Dependency Injection (CRITICAL - MANDATORY FOR TESTABILITY)

**ALWAYS use Dependency Injection - NEVER instantiate dependencies inside classes!**

```typescript
// ✅ CORRECT - Dependencies injected via constructor
class ModelPortfolioService {
  constructor(
    private readonly postgres: PostgresClient,
    private readonly logger: ILogger,
    private readonly modelPortfolioRepo: ModelPortfolioRepository, // ← Injected!
    private readonly profileRepo: InvestmentProfileRepository, // ← Injected!
    private readonly notificationService?: INotificationService
  ) {}
}

// ❌ WRONG - Creating dependencies inside constructor
class ModelPortfolioService {
  private readonly modelPortfolioRepo: ModelPortfolioRepository;

  constructor(
    private readonly postgres: PostgresClient,
    private readonly logger: ILogger
  ) {
    this.modelPortfolioRepo = new ModelPortfolioRepository(postgres, logger); // ❌ BAD!
  }
}
```

**Why Dependency Injection?**

1. **Testability:** Easy to mock dependencies in unit tests
2. **Flexibility:** Swap implementations without changing the service
3. **Separation of Concerns:** Service doesn't know how dependencies are created
4. **Best Practice:** Industry standard in enterprise applications

**Pattern:**

- Services receive repositories via constructor
- ServiceFactory creates and injects all dependencies
- Tests create mock repositories and inject them
- NO `new Repository()` calls inside service constructors

**See:** [docs/FRONTEND.md](../docs/FRONTEND.md) - Dependency Injection section

### 13. SOLID Principles

#### Single Responsibility Principle

- One class/function = one responsibility
- If a function does multiple things, split it

#### Open/Closed Principle

- Open for extension, closed for modification
- Use composition and dependency injection

#### Liskov Substitution Principle

- Derived types must be substitutable for base types
- Inheritance must maintain contracts

#### Interface Segregation Principle

- Many small, focused interfaces over large ones
- Clients shouldn't depend on methods they don't use

#### Dependency Inversion Principle

- Depend on abstractions, not concrete implementations
- High-level modules shouldn't depend on low-level modules

#### Separation of Concerns

- Clear separation between UI, business logic, and data access
- React components: only UI and user interaction
- Services: business logic and data access
- Hooks: shared stateful logic

### 13. KISS Principle (Keep It Simple, Stupid)

- Always choose the simplest solution that works
- Avoid unnecessary complexity and over-engineering
- Readable code is better than "clever" code
- If you can make it simpler, do it
- Complexity should only exist when it solves a real problem

### 14. YAGNI Principle (You Aren't Gonna Need It)

- Only write code that is needed right now
- No features for "maybe later" or "just in case"
- No speculative functionality
- When in doubt, leave it out
- Add features when they're actually required, not before

### React Component Structure

```typescript
// 1. Imports (grouped: React, UI, services, types, components)
// 2. Interfaces/Types
// 3. Component function
// 4. Hooks (useState, useEffect, custom hooks)
// 5. Event handlers (useCallback)
// 6. Render helpers
// 7. Return JSX
```

### Service Layer Pattern

```typescript
// All services should follow this pattern:
export const myService = {
  async getEntity(id: string): Promise<Entity> {},
  async createEntity(data: EntityInput): Promise<Entity> {},
  async updateEntity(id: string, data: Partial<EntityInput>): Promise<Entity> {},
  async deleteEntity(id: string): Promise<void> {},
};
```

### Error Handling Pattern

```typescript
// Always log errors with context
try {
  // operation
} catch (error) {
  logger.error('ComponentName', 'Operation description', error);
  // Show user-friendly message
  toast({ title: 'Error', description: 'User-friendly message', variant: 'destructive' });
  // Re-throw if caller needs to handle it
  throw error;
}
```

### Component Composition

- Extract reusable UI components into `/src/components/ui/` or feature-specific folders
- Use compound components pattern for complex components
- Prefer composition over props drilling

### State Management

- Local state for component-specific data (useState)
- Custom hooks for shared stateful logic
- Context for global app state (use sparingly)
- Server state management through react-query patterns

### File Organization

```
src/
├── components/        # Reusable UI components
│   ├── ui/           # Base UI components (shadcn/ui)
│   └── [feature]/    # Feature-specific components
├── pages/            # Page components (routes)
├── services/         # Business logic & data access
├── hooks/            # Custom React hooks
├── types/            # TypeScript type definitions
├── lib/              # Utility functions
└── integrations/     # External layer
├── *_importer.py     # Business logic
├── *_batch.py        # Orchestration
└── __tests__/        # Tests
```

## Big picture

- Frontend single-page app built with Vite + React + TypeScript (see `vite.config.ts` and `package.json`).
- postgres is the backend
 Local development.
- Services use a clear separation: `src/services` exposes factory/core/infrastructure modules. Re-exports live in `src/services/index.ts`.
- UI routing and auth are centralized in `src/App.tsx` + `src/context/AuthProvider.tsx`. Protected routes use `ProtectedRoute` under `src/components/auth`.

### Database Management (CRITICAL - READ CAREFULLY)

**❌ NEVER RESET THE DATABASE WITHOUT EXPLICIT USER PERMISSION**
- ❌ **NEVER** run `docker-compose down -v`
- ❌ **NEVER** drop/truncate tables without asking first
- ✅ **ALWAYS** ask user before ANY destructive database operation

**Why this is critical:**

- Database may contain hours of imported data (1M+ rows)
- Data import can take 10-15 minutes to restore
- CSV backups exist but restoration is time-consuming



### Demo Environment Setup (CRITICAL)

**ALWAYS use the setup script for demo environment setup:**

- ✅ **USE**: `./scripts/setup-demo-env.sh` for initializing demo data
- ✅ Script handles ALL setup: users, instruments, market data, portfolios
- ✅ Script activates `.venv` automatically
- ✅ Script uses correct encoding for CSV imports
- ❌ **DON'T** run individual import scripts manually (import_equities.py, etc.)
- ❌ **DON'T** try to manually orchestrate the import sequence

**When user asks to "initialize demo environment" or "setup demo data":**

```bash
./scripts/setup-demo-env.sh
```

The script performs:

1. Creates demo users (investors, advisors, admin)
2. Imports instruments (Equities, Bonds, ETFs, Funds, ETPs)
3. Imports market data from CSV files
4. Creates model portfolios
5. Simulates demo customer portfolios with historical performance

### Key files and patterns (examples)

- App entry: `src/main.tsx` (favicon, perf hooks, i18n import).
- Routes & auth: `src/App.tsx`, `src/context/AuthProvider.tsx`, `src/context/AuthContext.tsx`.
- Services pattern: `src/services/factory/ServiceFactory` (factories), `src/services/core/*` (interfaces), `src/services/infrastructure/*` (network, storage, ai). Prefer adding business logic to service modules instead of scattering fetch logic in components.
- Re-exports: `src/services/index.ts` — import top-level services from here when possible.
- Translations: `src/i18n.ts` and `src/locales/*`.

### Dev workflows and commands (extracted from repo)

- Local full stack (recommended):
  - Stop and remove volumes (reset DB): `docker-compose down -v`.
- App-only local development (no Docker DB):
  - Install: `npm install`
  - Dev server: `npm run dev` (Vite, default port 8080 from `vite.config.ts`).
  - Build: `npm run build`; preview: `npm run preview`.
- Lint / format: `npm run lint`, `npm run format`. Husky + lint-staged are enabled (see `package.json`).

### Database operations (CRITICAL)

