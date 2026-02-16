# Frontend Integration: User Profile Fields

## Übersicht

Die User-Endpoints (`POST /api/users` und `PUT /api/users/:id`) unterstützen jetzt optionale Profilfelder für die `user_profiles` Tabelle.

## ✅ Was wurde implementiert

### Backend Changes

1. **CreateUserRequest** und **UpdateUserRequest** erweitert um:
   - `title?: 'Herr' | 'Frau' | 'Divers'` - Anrede
   - `firstName?: string` - Vorname
   - `lastName?: string` - Nachname  
   - `birthDate?: Date` - Geburtsdatum (ISO 8601 format)

2. **Automatische Profilerstellung**: Wenn bei User-Erstellung alle 3 Pflichtfelder (`firstName`, `lastName`, `birthDate`) vorhanden sind, wird automatisch ein `user_profiles` Eintrag erstellt.

3. **Profilaktualisierung**: Bei User-Update werden Profilfelder automatisch aktualisiert oder erstellt.

## 🎯 Frontend Implementation

### Profile Loading Endpoints (Important)

There is no `GET /api/profile` endpoint in this backend.

Use one of these endpoints instead:

- `GET /api/auth/me` → returns current authenticated user identity (`id`, `email`, `role`)
- `GET /api/users/:id/details` → returns full profile payload (`user`, `profile`, `address`, `verificationStatus`)

Typical flow:

1. Call `GET /api/auth/me` with bearer token
2. Read `id` from response
3. Call `GET /api/users/:id/details`

If the frontend requests `GET /api/profile`, the backend will return `404 Not Found`.

### 1. User-Erstellung (Admin Panel / Registration)

**Endpoint**: `POST /api/users`

**Request Body**:
```typescript
interface CreateUserRequest {
  email: string;              // REQUIRED
  password: string;           // REQUIRED (min 8 chars, letter + number)
  role?: 'admin' | 'user' | 'advisor' | 'investor';
  
  // Optional profile fields
  title?: 'Herr' | 'Frau' | 'Divers';
  firstName?: string;
  lastName?: string;
  birthDate?: string;         // ISO 8601: "YYYY-MM-DD"
}
```

**Beispiel**:
```typescript
const createUser = async (userData: CreateUserRequest) => {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'max.mustermann@example.com',
      password: 'SecurePass123',
      role: 'user',
      title: 'Herr',
      firstName: 'Max',
      lastName: 'Mustermann',
      birthDate: '1990-01-15'
    })
  });
  
  return response.json();
};
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "max.mustermann@example.com",
    "role": "user",
    "createdAt": "2026-02-03T21:38:21.007Z"
  },
  "message": "User created successfully"
}
```

### 2. User-Update

**Endpoint**: `PUT /api/users/:id`

**Request Body**:
```typescript
interface UpdateUserRequest {
  email?: string;
  password?: string;
  role?: 'admin' | 'user' | 'advisor' | 'investor';
  emailVerified?: boolean;
  identityVerified?: boolean;
  
  // Optional profile fields
  title?: 'Herr' | 'Frau' | 'Divers';
  firstName?: string;
  lastName?: string;
  birthDate?: string;         // ISO 8601: "YYYY-MM-DD"
}
```

**Beispiel**:
```typescript
const updateUser = async (userId: string, updates: UpdateUserRequest) => {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Maximilian',  // Update nur Vorname
      lastName: 'Mustermann'
    })
  });
  
  return response.json();
};
```

### 3. User Details abrufen (mit Profil)

**Endpoint**: `GET /api/users/:id/details`

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "max.mustermann@example.com",
      "role": "user",
      "emailVerified": false,
      "createdAt": "2026-02-03T21:38:21.007Z",
      "updatedAt": "2026-02-03T21:38:21.007Z"
    },
    "profile": {
      "title": "Herr",
      "firstName": "Max",
      "lastName": "Mustermann",
      "birthDate": "1990-01-15T00:00:00.000Z"
    },
    "address": null,
    "verificationStatus": null
  }
}
```

## 📋 UI Components - Empfehlungen

### User Creation Form

```tsx
interface UserFormData {
  email: string;
  password: string;
  role: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
}

function CreateUserForm() {
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    role: 'user'
  });

  return (
    <form onSubmit={handleSubmit}>
      {/* Basis-Felder */}
      <Input 
        label="Email" 
        name="email"
        type="email"
        required
      />
      <Input 
        label="Passwort" 
        name="password"
        type="password"
        required
        minLength={8}
        helperText="Min. 8 Zeichen, Buchstabe + Zahl"
      />
      <Select 
        label="Rolle" 
        name="role"
        options={['user', 'admin', 'advisor', 'investor']}
      />

      {/* Profilfelder (optional) */}
      <Divider>Profil-Informationen (optional)</Divider>
      
      <Select 
        label="Anrede" 
        name="title"
        options={['Herr', 'Frau', 'Divers']}
      />
      <Input 
        label="Vorname" 
        name="firstName"
      />
      <Input 
        label="Nachname" 
        name="lastName"
      />
      <Input 
        label="Geburtsdatum" 
        name="birthDate"
        type="date"
      />

      <Button type="submit">Benutzer erstellen</Button>
    </form>
  );
}
```

## 🔍 Wichtige Hinweise

### Validierung

1. **Email & Passwort**: Pflichtfelder bei Erstellung
2. **Passwort-Policy**: 
   - Minimum 8 Zeichen
   - Mindestens 1 Buchstabe
   - Mindestens 1 Zahl
3. **Profilfelder**: Alle optional, aber wenn Profil erstellt werden soll, müssen `firstName`, `lastName` UND `birthDate` vorhanden sein
4. **Geburtsdatum**: User muss mindestens 18 Jahre alt sein (backend validation)

### Fehlerbehandlung

```typescript
const handleCreateUser = async (data: CreateUserRequest) => {
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!result.success) {
      // Zeige Fehler an
      if (result.error.includes('email already exists')) {
        toast.error('Diese Email-Adresse wird bereits verwendet');
      } else if (result.error.includes('password')) {
        toast.error('Passwort erfüllt nicht die Anforderungen');
      } else {
        toast.error(result.error);
      }
      return;
    }

    // Erfolg
    toast.success('Benutzer erfolgreich erstellt');
    return result.data;
  } catch (error) {
    toast.error('Netzwerkfehler beim Erstellen des Benutzers');
  }
};
```

## 📊 Datenbank-Schema

Zur Referenz:

```sql
-- users Tabelle (auth)
users {
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  passwordhash TEXT,
  role VARCHAR(50),
  ...
}

-- user_profiles Tabelle (profile data)
user_profiles {
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title user_title_enum ('Herr', 'Frau', 'Divers'),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL CHECK (birth_date <= CURRENT_DATE - INTERVAL '18 years'),
  ...
}
```

## 🧪 Testing

### Curl Test

```bash
# User mit Profil erstellen
curl -X POST http://localhost:8888/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123",
    "role": "user",
    "title": "Frau",
    "firstName": "Anna",
    "lastName": "Schmidt",
    "birthDate": "1985-03-20"
  }'

# User-Details mit Profil abrufen
curl http://localhost:8888/api/users/{userId}/details

# Profil aktualisieren
curl -X PUT http://localhost:8888/api/users/{userId} \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Annemarie",
    "title": "Divers"
  }'
```

## ✅ Checkliste für Frontend-Integration

- [ ] User-Erstellungs-Formular um optionale Profilfelder erweitert
- [ ] User-Update-Formular um Profilfelder erweitert
- [ ] User-Details-View zeigt Profilinformationen an
- [ ] Validierung für Geburtsdatum (18+ Jahre) implementiert
- [ ] Fehlerbehandlung für alle Validierungsfehler
- [ ] Tests für User-Erstellung mit/ohne Profil
- [ ] UI-Tests für Formular-Validierung

## 🔗 Related Endpoints

- `POST /api/users` - User erstellen (mit optionalem Profil)
- `PUT /api/users/:id` - User aktualisieren (inkl. Profil)
- `GET /api/users/:id` - Basis-User-Daten
- `GET /api/users/:id/details` - User mit allen Details (Profil, Adresse, Verification)

## 📝 Swagger Dokumentation

Die vollständige API-Dokumentation mit allen Feldern ist verfügbar unter:
- http://localhost:8888/api-docs
