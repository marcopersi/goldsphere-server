# Service Refactoring Status - Clean Architecture Migration

## Ziel-Architektur pro Domain

```
src/services/{domain}/
├── I{Domain}Service.ts          # Service Interface
├── impl/
│   └── {Domain}ServiceImpl.ts   # Service Implementation (DI)
├── repository/
│   ├── I{Domain}Repository.ts   # Repository Interface
│   └── {Domain}RepositoryImpl.ts # Repository Implementation
├── mock/
│   └── {Domain}RepositoryMock.ts # Mock für Tests (optional)
├── types/
│   └── {Domain}Types.ts         # Alle Types/Interfaces
├── {Domain}ServiceFactory.ts    # Factory mit DI
└── index.ts                      # Barrel Export
```

## Prinzipien (MUST HAVE)

- ✅ **DI (Dependency Injection)**: Constructor Injection für alle Dependencies
- ✅ **DRY (Don't Repeat Yourself)**: Keine Code-Duplikation
- ✅ **SOLID Prinzipien**: Alle 5 Prinzipien anwenden
- ✅ **Separation of Concerns**: Klare Trennung UI/Business/Data
- ✅ **GOF Patterns**: Strategy, Factory, Repository
- ✅ **KISS**: Keep It Simple
- ✅ **Clean Code**: Lesbar, verständlich, wartbar
- ✅ **Clean Architecture**: Unabhängigkeit von Frameworks/DB
- ✅ **Strong Typing**: Keine `any`, strikte Typisierung
- ✅ **No Dead Code**: Kein ungenutzter Code
- ✅ **Max 300 LOC**: Keine Datei über 300 Zeilen

---

## 1. ✅ DONE: Market Data Service

**Status:** ✅ KOMPLETT REFACTORED

### Struktur:
```
src/services/market-data/
├── IMarketDataService.ts                     ✅ Interface
├── impl/
│   └── MarketDataServiceImpl.ts              ✅ Implementation (263 LOC)
├── repository/
│   ├── IMarketDataRepository.ts              ✅ Interface
│   └── MarketDataRepositoryImpl.ts           ✅ Implementation (353 LOC)
├── mock/
│   └── MarketDataRepositoryMock.ts           ✅ Mock (245 LOC)
├── providers/
│   ├── IMarketDataProvider.ts                ✅ Interface
│   └── SIXSwissExchangeProvider.ts           ✅ Free Provider (kein API Key)
├── types/
│   └── MarketDataTypes.ts                    ✅ Types (138 LOC)
├── MarketDataServiceFactory.ts               ✅ Factory mit DI
├── marketDataScheduler.ts                    ✅ Scheduler mit DI
└── index.ts                                   ✅ Barrel Export
```

### Highlights:
- ✅ Vollständige DI
- ✅ Strategy Pattern für Provider
- ✅ Repository Pattern
- ✅ Factory Pattern
- ✅ Mock Implementation für Tests
- ✅ Keine Datei > 300 LOC
- ✅ Strong Typing
- ✅ Scheduler mit DI refactored

---

## 2. ⚠️ Product Service

**Status:** Weitgehend umgesetzt (Factory, Mock, Repo/Impl, Interfaces, Barrel Export). Unit-Tests grün. Noch zu klären: Namensvereinheitlichung/LOC-Check/Type-Konsolidierung.

### Aktuelle Struktur (Stand jetzt):
```
src/services/product/
├── IProductService.ts                        ✅ Interface
├── IProductManagementService.ts              ✅ Interface
├── impl/
│   ├── ProductServiceImpl.ts                 ✅ DI
│   └── ProductManagementService.ts           ✅ DI
├── repository/
│   ├── IProductRepository.ts                 ✅ Interface
│   └── ProductRepositoryImpl.ts              ✅ Implementation
├── mock/
│   └── ProductRepositoryMock.ts              ✅ Tests grün
├── types/
│   └── ProductTypes.ts                       ✅ Types
├── ProductServiceFactory.ts                  ✅ Factory
└── index.ts                                  ✅ Barrel Export
```

### Offene Punkte:
- [ ] Naming/LOC Check und Konsolidierung der Types
- [ ] Evtl. überflüssige Importe/Barrel-Abhängigkeiten prüfen

---

## 3. ✅ DONE: User Service

**Status:** ✅ KOMPLETT REFACTORED (Januar 2026)

### Struktur:
```
src/services/user/
├── IRegistrationService.ts                   ✅ Interface
├── impl/
│   ├── UserRegistrationServiceImpl.ts        ✅ Implementation (DI)
│   ├── TokenService.ts                       ✅ Token Generation
│   ├── PasswordService.ts                    ✅ Password Utils
│   └── index.ts                              ✅ Barrel Export
├── repository/
│   ├── IUserRepository.ts                    ✅ Interface (~150 LOC)
│   ├── UserRepositoryImpl.ts                 ✅ Implementation (297 LOC)
│   ├── UserRepository.ts                     ✅ Legacy für Registration
│   └── index.ts                              ✅ Barrel Export
├── service/
│   ├── IUserService.ts                       ✅ Interface (~145 LOC)
│   ├── UserServiceImpl.ts                    ✅ Implementation (~295 LOC)
│   └── index.ts                              ✅ Barrel Export
├── mock/
│   ├── UserRepositoryMock.ts                 ✅ Mock Implementation
│   └── index.ts                              ✅ Barrel Export
├── types/
│   ├── UserEnums.ts                          ✅ Enums (103 LOC)
│   ├── UserEntityTypes.ts                    ✅ Entity Types (222 LOC)
│   ├── UserDTOs.ts                           ✅ DTOs (214 LOC)
│   ├── UserMappers.ts                        ✅ Mappers (192 LOC)
│   └── index.ts                              ✅ Barrel Export
├── registrationTypes.ts                      ✅ Zod Schemas
├── UserServiceFactory.ts                     ✅ Factory mit DI
└── index.ts                                  ✅ Barrel Export
```

### Highlights:
- ✅ Vollständige DI (Constructor Injection)
- ✅ Repository Pattern mit Interface
- ✅ Service Pattern mit Interface
- ✅ Factory Pattern (createUserService, createUserRepository)
- ✅ Mock Implementation für Tests
- ✅ Keine Datei > 300 LOC
- ✅ Strong Typing (keine `any`)
- ✅ PostgreSQL ENUMs (initdb/06-user-enums.sql)
- ✅ Zod Validation für Registration
- ✅ bcrypt Password Hashing
- ✅ **33 Unit Tests** (userService.unit.test.ts)
- ✅ **30 Integration Tests** (users.api.integration.test.ts)

### Refactored Route:
- `src/routes/users.ts` - Komplett auf UserService umgestellt (kein direktes SQL)
- Alle CRUD-Operationen via IUserService
- Neuer Endpoint: `GET /api/users/:id/details`
- Proper HTTP Status Mapping

### Test Coverage:
```
Unit Tests (33):
- createUser (8 tests): create, hash, duplicate, validation
- getUserById (2 tests): found, not found
- getUserByEmail (2 tests): case insensitive, not found
- getUserWithDetails (2 tests): with profile, not found
- getUsers (2 tests): pagination, role filter
- updateUser (3 tests): update, duplicate, not found
- deleteUser (2 tests): delete, not found
- validateCredentials (3 tests): valid, wrong, not found
- isEmailAvailable (3 tests): exists, new, exclude
- validateEmailFormat (2 tests): valid, invalid
- validatePassword (4 tests): strong, short, no letters, no numbers

Integration Tests (30):
- GET /api/users (7 tests)
- POST /api/users (7 tests)
- GET /api/users/:id (3 tests)
- GET /api/users/:id/details (2 tests)
- PUT /api/users/:id (5 tests)
- DELETE /api/users/:id (3 tests)
- Input Validation (1 test)
- Pagination Edge Cases (2 tests)
```

---

## 4. ⚠️ TODO: Order Service

**Status:** ⚠️ TEILWEISE - Basic Struktur vorhanden

### Aktuelle Struktur:
```
src/services/order/
├── IOrderService.ts                          ✅ Interface vorhanden
└── impl/
    └── OrderService.ts                       ⚠️ Prüfen
```

### TODO:
- [ ] Repository Pattern implementieren
- [ ] `IOrderRepository.ts` erstellen
- [ ] `OrderRepositoryImpl.ts` erstellen
- [ ] DI prüfen und korrigieren
- [ ] Mock-Implementation erstellen
- [ ] Factory Pattern implementieren
- [ ] Types in separates File extrahieren
- [ ] Barrel Export erstellen
- [ ] SQL-Queries aus Service in Repository verschieben

---

## 5. ⚠️ Portfolio Service

**Status:** Struktur vorhanden (IPortfolioService, ServiceImpl, RepositoryImpl, Mock, Factory, Barrel Export). Offener Build-Fehler: `ListPortfoliosOptions` Import. LOC/Type-Konsolidierung noch prüfen.

### Aktuelle Struktur (Stand jetzt):
```
src/services/portfolio/
├── IPortfolioService.ts                      ✅ Interface
├── impl/
│   └── PortfolioServiceImpl.ts               ✅ DI
├── repository/
│   ├── IPortfolioRepository.ts               ✅ Interface
│   └── PortfolioRepositoryImpl.ts            ✅ Implementation
├── mock/
│   └── PortfolioRepositoryMock.ts            ✅ vorhanden
├── types/
│   └── PortfolioTypes.ts                     ✅ Types (ListPortfoliosOptions defined)
├── PortfolioServiceFactory.ts                ✅ Factory
└── index.ts                                  ✅ Barrel Export
```

### Offene Punkte:
- [ ] Build/Import-Fehler `ListPortfoliosOptions` fixen
- [ ] LOC und Type-Aufteilung prüfen

---

## 6. ⚠️ TODO: Calculation Service

**Status:** ⚠️ TEILWEISE - Basic Struktur vorhanden

### Aktuelle Struktur:
```
src/services/calculation/
├── ICalculationService.ts                    ✅ Interface vorhanden
└── impl/
    └── CalculationServiceImpl.ts             ⚠️ Prüfen
```

### TODO:
- [ ] Prüfen ob Repository nötig (Pure Business Logic?)
- [ ] DI prüfen und korrigieren
- [ ] Mock-Implementation erstellen (wenn nötig)
- [ ] Factory Pattern implementieren
- [ ] Types in separates File extrahieren
- [ ] Barrel Export erstellen
- [ ] LOC prüfen

---

## 7. ⚠️ TODO: Payment Service

**Status:** ⚠️ BASIC - Nur Implementation

### Aktuelle Struktur:
```
src/services/payment/
└── impl/
    └── PaymentService.ts                     ⚠️ Kein Interface!
```

### TODO:
- [ ] `IPaymentService.ts` erstellen
- [ ] Repository Pattern implementieren
- [ ] `IPaymentRepository.ts` erstellen
- [ ] `PaymentRepositoryImpl.ts` erstellen
- [ ] DI implementieren
- [ ] Mock-Implementation erstellen
- [ ] Factory Pattern implementieren
- [ ] Types in separates File extrahieren
- [ ] Barrel Export erstellen
- [ ] Integration mit Payment Provider (Stripe?) prüfen

---

## 8. ⚠️ TODO: Email Service

**Status:** ⚠️ BASIC - Einzelne Datei

### Aktuelle Struktur:
```
src/services/email/
└── EmailService.ts                           ⚠️ Kein Interface, keine Struktur
```

### TODO:
- [ ] `IEmailService.ts` erstellen
- [ ] `EmailService.ts` → `impl/EmailServiceImpl.ts` verschieben
- [ ] Repository Pattern (für Templates?) überlegen
- [ ] DI implementieren
- [ ] Mock-Implementation erstellen (für Tests ohne SMTP)
- [ ] Factory Pattern implementieren
- [ ] Types in separates File extrahieren
- [ ] Barrel Export erstellen
- [ ] Email Templates auslagern

---

## Weitere Domains (Zusätzlich identifiziert)

### 9. ❌ TODO: Auth Service (noch nicht vorhanden)

Aktuell vermischt in User Service (`TokenService`, etc.)

**TODO:**
- [ ] Neue Domain `src/services/auth/` erstellen
- [ ] `IAuthService.ts` Interface
- [ ] `AuthServiceImpl.ts` Implementation
- [ ] JWT Token Management
- [ ] Session Management
- [ ] Factory + DI

### 10. ❌ TODO: Custodian Service

Aktuell in Routes (`src/routes/custodians.ts`)

**TODO:**
- [ ] Neue Domain `src/services/custodian/` erstellen
- [ ] Business Logic aus Routes extrahieren
- [ ] Repository Pattern implementieren

### 11. ❌ TODO: Transaction Service

### Producer Hinweis
- Shared Package 1.4.6 hat `Producer` entfernt. Producer-API weiter funktionsfähig durch lokale Schemas in `src/routes/producers.ts` und reaktivierte Route in `app.ts`.

Aktuell in Routes (`src/routes/transactions.ts`)

**TODO:**
- [ ] Neue Domain `src/services/transaction/` erstellen
- [ ] Business Logic aus Routes extrahieren
- [ ] Repository Pattern implementieren

---

## Prioritäten

### ✅ COMPLETED
1. **Market Data Service** - Provider-basierte Marktdaten
2. **User Service** - Authentifizierung & Registration (Januar 2026)

### 🔥 HIGH PRIORITY (Core Business Logic)
3. **Product Service** - Kern des E-Commerce (weitgehend fertig)
4. **Order Service** - Bestellabwicklung
5. **Portfolio Service** - Kernfunktionalität (Build-Fehler beheben)

### 🔸 MEDIUM PRIORITY
6. **Payment Service** - Payment Provider Integration
7. **Calculation Service** - Preisberechnung
8. **Auth Service** (neu) - Security

### 🔹 LOW PRIORITY
9. **Email Service** - Notifications
10. **Custodian Service** (neu)
11. **Transaction Service** (neu)

---

## Refactoring Checkliste pro Service

Für jeden Service folgende Steps durchführen:

### Phase 1: Analyse
- [ ] Aktuelle Dateien und LOC zählen
- [ ] Dependencies identifizieren
- [ ] Code-Duplikationen finden
- [ ] SQL-Queries identifizieren
- [ ] Business Logic vs Data Access trennen

### Phase 2: Struktur
- [ ] `I{Domain}Service.ts` Interface erstellen/prüfen
- [ ] `impl/{Domain}ServiceImpl.ts` erstellen
- [ ] `repository/I{Domain}Repository.ts` erstellen
- [ ] `repository/{Domain}RepositoryImpl.ts` erstellen
- [ ] `mock/{Domain}RepositoryMock.ts` erstellen
- [ ] `types/{Domain}Types.ts` erstellen

### Phase 3: Implementation
- [ ] SQL aus Service in Repository verschieben
- [ ] DI Constructor Injection implementieren
- [ ] Factory Pattern implementieren
- [ ] Mock mit Testdaten befüllen
- [ ] Barrel Export (`index.ts`) erstellen

### Phase 4: Tests
- [ ] Unit Tests mit Mock erstellen
- [ ] Integration Tests aktualisieren
- [ ] Test Coverage prüfen

### Phase 5: Cleanup
- [ ] Alte Dateien löschen
- [ ] Imports aktualisieren
- [ ] ESLint Errors fixen
- [ ] Build testen
- [ ] Alle Tests laufen lassen

---

## Status Übersicht

| Service | Interface | Impl | Repository | Mock | Factory | Types | Export | Status |
|---------|-----------|------|------------|------|---------|-------|--------|--------|
| Market Data | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ DONE |
| Product | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ca. 80% (Naming/LOC/Types prüfen) |
| User | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | 20% (Passwortfeld erledigt) |
| Order | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | 20% |
| Portfolio | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ca. 70% (Import-Fix offen) |
| Calculation | ✅ | ⚠️ | ❓ | ❌ | ❌ | ❌ | ❌ | 20% |
| Payment | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | 10% |
| Email | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | 10% |

**Legende:**
- ✅ Done
- ⚠️ Exists but needs review/refactoring
- ❌ Missing
- ❓ Unclear if needed

---

## Nächste Schritte

1. **Product Service** komplett refactoren (HIGH PRIORITY)
2. **Order Service** komplett refactoren (HIGH PRIORITY)
3. **User Service** cleanup und Repository hinzufügen (HIGH PRIORITY)
4. **Portfolio Service** refactoren (HIGH PRIORITY)
5. Rest nach Priorität abarbeiten

---

**Geschätzter Aufwand:** 
- Pro High-Priority Service: 2-4 Stunden
- Pro Medium-Priority Service: 1-2 Stunden
- Pro Low-Priority Service: 0.5-1 Stunde
- **Gesamt: ~15-25 Stunden** für komplette Migration

**Stand:** 11. Januar 2026
**Fortschritt:** 1/8 Services komplett (12.5%) – Product & Portfolio deutlich weiter, siehe Status unten
