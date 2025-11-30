# GoldSphere Server

[![CI/CD](https://github.com/marcopersi/goldsphere-server/workflows/CI%2FCD/badge.svg)](https://github.com/marcopersi/goldsphere-server/actions/workflows/ci-cd.yml)

Backend-Server für die GoldSphere Plattform - Verwaltung von Edelmetall-Portfolios, Orders, Zahlungen und User Management.

## 📋 Voraussetzungen

- **Node.js** 18+ oder **Bun** (empfohlen)
- **Docker** & **Docker Compose**
- **Git**

## 🚀 Projekt Setup

### 1. Repository klonen
```bash
git clone https://github.com/marcopersi/goldsphere-server.git
cd goldsphere-server
```

### 2. Environment Variables konfigurieren
```bash
# Kopiere die Beispiel-.env
cp .env.example .env

# Bearbeite .env und füge deine Credentials hinzu:
# - Stripe Keys
# - Gmail SMTP (für Email-Verifikation)
# - JWT Secret
```

**Wichtige Environment Variables:**
```env
# Database (wird von Docker verwendet)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=goldsphere
DB_USER=postgres
DB_PASSWORD=postgres

# Server
PORT=8888
NODE_ENV=development

# Stripe (für Payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Email (Gmail SMTP)
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# JWT
JWT_SECRET=your-secret-key-min-32-chars
```

### 3. Datenbank starten
```bash
# PostgreSQL und pgAdmin starten
npm run docker:up

# Oder direkt mit docker-compose
docker-compose up -d postgres pgadmin
```

**Was passiert beim ersten Start:**
- PostgreSQL Container wird gestartet
- Datenbank `goldsphere` wird erstellt
- Alle SQL-Scripts aus `initdb/` werden automatisch ausgeführt:
  - `01-schema.sql` - Tabellen, Constraints, Enums
  - `02-initialLoad.sql` - Referenzdaten (Währungen, Metalle, Länder)
  - `03-sampleData.sql` - Beispieldaten für Development
  - `04-enhanced-user-registration.sql` - User Registration Features

### 4. Dependencies installieren
```bash
npm install
# oder mit Bun:
bun install
```

### 5. Anwendung bauen und starten
```bash
# TypeScript kompilieren
npm run build

# Server starten (Production-Mode)
npm start

# Oder direkt im Development-Mode mit Auto-Reload
npm run dev
```

Der Server läuft jetzt auf: **http://localhost:8888**

## 🔧 Development

### Development Server starten
```bash
npm run dev
```
- Startet mit **nodemon** - automatischer Reload bei Code-Änderungen
- Läuft auf Port **8888** (konfigurierbar via `.env`)
- TypeScript wird automatisch kompiliert

### Build Commands
```bash
npm run build         # TypeScript kompilieren
npm run build:watch   # Build im Watch-Mode
npm run lint          # ESLint ausführen
npm run lint:fix      # ESLint mit Auto-Fix
```

## 🗄️ Datenbank Management

### pgAdmin Web Interface
**URL:** [http://localhost:8880](http://localhost:8880)

**Login:**
- Email: `marcopersi@me.com`
- Password: `admin`

**Server registrieren (beim ersten Login):**
1. Right-click "Servers" → "Register" → "Server"
2. **General Tab:**
   - Name: `GoldSphere Local`
3. **Connection Tab:**
   - Host: `postgres-goldsphere-db` ⚠️ (Container-Name, nicht localhost!)
   - Port: `5432`
   - Maintenance database: `goldsphere`
   - Username: `postgres`
   - Password: `postgres`
4. Click "Save"

### Docker Commands
```bash
# Alle Container starten (Postgres + pgAdmin)
npm run docker:up

# Container stoppen
npm run docker:down

# Datenbank komplett zurücksetzen (inkl. Volumes)
npm run docker:reset
# ⚠️ Löscht alle Daten! Init-Scripts werden neu ausgeführt
```

### Direkte Datenbank-Verbindung
```bash
# PostgreSQL CLI im Container öffnen
docker exec -it postgres-goldsphere-db psql -U postgres -d goldsphere

# SQL-Script manuell ausführen
docker exec -i postgres-goldsphere-db psql -U postgres -d goldsphere < initdb/01-schema.sql

# Backup erstellen
docker exec postgres-goldsphere-db pg_dump -U postgres goldsphere > backup.sql
```

### Datenbank Struktur
```
goldsphere/
├── users              # User Accounts & Authentication
├── user_profiles      # User Profile Details
├── user_addresses     # User Shipping Addresses
├── portfolio          # User Portfolios
├── position           # Portfolio Positions
├── orders             # Buy/Sell Orders
├── transactions       # Financial Transactions
├── product            # Edelmetall-Produkte
├── producer           # Produzenten/Hersteller
├── custodian          # Verwahrer
├── custodyservice     # Verwahrungsdienstleistungen
├── currency           # Währungen (CHF, EUR, USD, etc.)
├── metal              # Metalle (Gold, Silber, etc.)
├── country            # Länder
└── producttype        # Produkttypen (Münzen, Barren)
```

## 🧪 Testing

### Test Overview
```bash
# Alle Tests ausführen
npm run test:all

# Unit Tests
npm run test:unit

# Integration Tests (benötigt laufende DB)
npm run test:integration

# Contract Tests
npm run test:contracts

# Tests im Watch-Mode
npm run test:watch

# Coverage Report
npm run test:coverage
```

### Test-Umgebung
```bash
# Test-Datenbank Container starten
DB_NAME=goldsphere_test docker-compose up -d postgres

# Integration Tests ausführen
npm run test:integration

# Test-Datenbanken aufräumen
npm run test:integration:cleanup
```

## 💳 Payment API Testing (Stripe)

The project includes comprehensive payment integration tests that validate the entire Stripe payment flow.

### Quick Payment Test

Runs a fast integration test covering authentication, payment creation, retrieval, and validation:

```bash
# Ensure server is running first
npm start

# In a new terminal, run the test
npm run test:payment-quick
```

**Prerequisites:**
- Server running on `localhost:8080`
- Stripe CLI installed and logged in (`stripe login`)
- Stripe CLI forwarding webhooks: `stripe listen --forward-to localhost:8080/api/v1/payments/webhook`

**What it tests:**
1. Server health check
2. JWT authentication
3. Payment intent creation ($25 test transaction)
4. Payment intent retrieval
5. Payment confirmation validation (expected to fail without payment method)
6. Payment methods listing (expected to fail with test customer)
7. Authentication validation (unauthorized requests)

### Full Integration Tests

For comprehensive testing with automatic server/Stripe CLI management:

```bash
npm run test:payment-integration
```

The test will automatically:
- Start the server
- Start Stripe CLI webhook forwarding  
- Run all payment flow tests
- Clean up processes when complete

All tests validate real Stripe API integration with proper error handling and webhook processing.

## 📧 Email Service Setup

Das Projekt nutzt **Gmail SMTP** für Email-Verifikation bei User-Registrierung.

### Gmail App Password erstellen:
1. Google Account → Sicherheit → 2FA aktivieren
2. App-Passwörter → "Mail" auswählen
3. Name: "GoldSphere Server"
4. Generiertes Passwort in `.env` eintragen:
```env
SMTP_USER=your.email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx
```

### Email Service testen:
```bash
# Connection Test
npm run test:email

# Test-Email senden
npm run test:email your.email@example.com
```

Siehe `docs/EMAIL_SETUP.md` für Details.

## 📁 Projekt-Struktur

```
goldsphere-server/
├── src/
│   ├── index.ts                 # Entry Point
│   ├── server.ts                # Express Server Setup
│   ├── app.ts                   # App Factory
│   ├── dbConfig.ts              # PostgreSQL Pool Config
│   ├── authMiddleware.ts        # JWT Authentication
│   ├── routes/                  # API Endpoints
│   │   ├── users.ts            # User Management & Auth
│   │   ├── orders.ts           # Order Management
│   │   ├── portfolio.ts        # Portfolio Management
│   │   ├── products.ts         # Product Catalog
│   │   ├── producers.ts        # Producer Management
│   │   ├── custodians.ts       # Custodian Management
│   │   └── references.ts       # Reference Data
│   ├── services/               # Business Logic
│   │   ├── OrderService.ts
│   │   ├── PortfolioService.ts
│   │   ├── EmailService.ts
│   │   └── PaymentService.ts
│   ├── repositories/           # Data Access Layer
│   ├── utils/                  # Helper Functions
│   └── queries/                # SQL Query Templates
├── tests/
│   ├── unit/                   # Unit Tests
│   ├── integration/            # Integration Tests
│   └── contracts/              # Contract Tests
├── initdb/                     # Database Init Scripts
│   ├── 01-schema.sql          # Database Schema
│   ├── 02-initialLoad.sql     # Reference Data
│   ├── 03-sampleData.sql      # Sample Data
│   └── 04-enhanced-user-registration.sql
├── scripts/                    # Utility Scripts
├── docs/                       # Documentation
├── docker-compose.yml          # Docker Services
├── Dockerfile                  # Production Docker Image
├── package.json               # Dependencies & Scripts
├── tsconfig.json              # TypeScript Config
└── .env                       # Environment Variables
```

## 🔐 API Authentication

Das API nutzt **JWT (JSON Web Tokens)** für Authentication.

### Registrierung:
```bash
POST /api/users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Login:
```bash
POST /api/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

# Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "email": "..." }
}
```

### Geschützte Endpoints:
```bash
GET /api/portfolio
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## 🛠️ Verfügbare NPM Scripts

| Script | Beschreibung |
|--------|-------------|
| `npm start` | Production Server starten (mit Build) |
| `npm run dev` | Development Server (Auto-Reload) |
| `npm run build` | TypeScript kompilieren |
| `npm run lint` | Code-Qualität prüfen |
| `npm run lint:fix` | Lint-Fehler automatisch fixen |
| `npm test` | Unit Tests ausführen |
| `npm run test:all` | Alle Tests (Unit + Integration) |
| `npm run test:integration` | Integration Tests |
| `npm run test:coverage` | Test Coverage Report |
| `npm run docker:up` | Docker Container starten |
| `npm run docker:down` | Docker Container stoppen |
| `npm run docker:reset` | Datenbank komplett zurücksetzen |
| `npm run test:email` | Email Service testen |

## 🚢 Deployment

### Docker Image bauen:
```bash
# Image bauen
docker build -t goldsphere-server .

# Container starten
docker run -p 8888:8888 --env-file .env goldsphere-server
```

### Mit Docker Compose (Production):
```bash
# Production Environment
docker-compose -f docker-compose.prod.yml up -d
```

### Environment-spezifische Configs:
```bash
# Development
npm run dev

# Test
npm run dev:test

# Production
npm run dev:prod
```

## 🔧 Troubleshooting

### Datenbank-Verbindung schlägt fehl
```bash
# Container-Status prüfen
docker ps

# PostgreSQL Logs ansehen
docker logs postgres-goldsphere-db

# Neustart
npm run docker:reset
```

### Port bereits belegt
```bash
# Prozess auf Port 8888 finden
lsof -i :8888

# Port in .env ändern
PORT=8889
```

### TypeScript Compile-Fehler
```bash
# node_modules neu installieren
rm -rf node_modules package-lock.json
npm install

# Build-Cache löschen
rm -rf dist
npm run build
```

### Tests schlagen fehl
```bash
# Test-Datenbank zurücksetzen
npm run test:integration:cleanup

# PostgreSQL für Tests starten
docker-compose up -d postgres

# Tests erneut ausführen
npm run test:all
```

## 📚 Weitere Dokumentation

- [Email Service Setup](docs/EMAIL_SETUP.md) - Gmail SMTP Konfiguration
- [API Documentation](http://localhost:8888/api-docs) - Swagger UI (wenn Server läuft)
- [Shared Package Usage](docs/shared-package-usage.md) - @marcopersi/shared Package

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Code-Qualität:
- ESLint läuft automatisch bei `git commit` (Husky Pre-Commit Hook)
- Tests müssen erfolgreich sein
- TypeScript ohne Compile-Fehler

## 📝 License

ISC

## 👥 Authors

- Marco Persi - [@marcopersi](https://github.com/marcopersi)

## 🆘 Support

Bei Fragen oder Problemen:
- GitHub Issues: [github.com/marcopersi/goldsphere-server/issues](https://github.com/marcopersi/goldsphere-server/issues)
- Email: [Contact](mailto:marcopersi@me.com)

---

**Made with ❤️ for GoldSphere**