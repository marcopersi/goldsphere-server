# Frontend Integration: User Profile and User Management

## Purpose

This document describes how Web and Mobile clients should integrate the latest user-related backend changes.

## What Changed

### New/Updated behavior

- `PATCH /api/users/{id}/profile` is available for partial profile and address updates.
- `POST /api/users` and `PUT /api/users/{id}` now validate `role` and `title` dynamically.
- `PATCH /api/users/{id}/profile` validates profile reference fields (for example `preferredCurrency` and `address.countryId`).
- Validation errors are standardized to `code: "VALIDATION_ERROR"` with field-level details.
- Protected routes now reject stale JWT role claims and inactive/deleted users.

### No profile shortcut endpoint

There is still no `GET /api/profile` endpoint.

Use this flow:

1. `GET /api/auth/me` to resolve the authenticated user id.
2. `GET /api/users/{id}/details` to get full profile data.

## API Contracts

### 1) Get full user profile state

Endpoint: `GET /api/users/{id}/details`

Response shape:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "customer",
      "emailVerified": true
    },
    "profile": {
      "title": "Herr",
      "firstName": "Max",
      "lastName": "Mustermann",
      "birthDate": "1990-01-15T00:00:00.000Z",
      "phone": "+41795551234",
      "gender": "prefer_not_to_say",
      "preferredCurrency": "CHF",
      "preferredPaymentMethod": "bank_transfer"
    },
    "address": {
      "countryId": "uuid",
      "postalCode": "8001",
      "city": "Zürich",
      "state": "ZH",
      "street": "Bahnhofstrasse",
      "houseNumber": "10A",
      "addressLine2": "3rd floor",
      "poBox": "Postfach 42"
    },
    "verificationStatus": {
      "emailStatus": "verified",
      "identityStatus": "pending"
    }
  }
}
```

### 2) Patch profile and address (recommended for profile screens)

Endpoint: `PATCH /api/users/{id}/profile`

Request fields are optional and support partial updates:

```typescript
interface PatchUserProfileRequest {
  title?: string | null;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  phone?: string | null;                 // E.164 format
  gender?: string | null;
  preferredCurrency?: string | null;     // ISO 4217 alpha-3
  preferredPaymentMethod?: string | null;
  address?: {
    countryId?: string | null;           // UUID
    postalCode?: string | null;
    city?: string | null;
    state?: string | null;
    street?: string | null;
    houseNumber?: string | null;
    addressLine2?: string | null;
    poBox?: string | null;
  };
}
```

Response shape:

```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "profile": { "firstName": "Max" },
    "address": { "city": "Zürich" },
    "verificationStatus": null
  }
}
```

### 3) Create and update user (admin flows)

Endpoints:

- `POST /api/users`
- `PUT /api/users/{id}`

Important:

- `role` and `title` are accepted as strings but validated server-side.
- Do not hardcode role/title enums in frontend logic.
- Read possible values from backend-managed reference data in your app bootstrap flow.
- Use `GET /api/references` and consume `data.roles[]` plus `data.titles[]`.

Example (excerpt):

```json
{
  "success": true,
  "data": {
    "roles": [
      { "value": "customer", "displayName": "customer" },
      { "value": "admin", "displayName": "admin" }
    ],
    "titles": [
      { "value": "Herr", "displayName": "Herr" },
      { "value": "Frau", "displayName": "Frau" },
      { "value": "Divers", "displayName": "Divers" }
    ]
  }
}
```

## Standard Validation Error Contract

All user-related validation errors should be handled with this shape:

```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "fields": [
      {
        "path": "preferredCurrency",
        "message": "Unknown currency code"
      }
    ]
  }
}
```

Client handling rule:

- Map `details.fields[]` directly to field-level form errors.
- Use `path` values for nested form keys (for example `address.countryId`).

## Auth/Session Implications (Web + Mobile)

Because token claims are now checked against live user state:

- A token can become invalid before `exp` when role changes.
- A token can become invalid when account status becomes inactive/deleted.

When API returns `401` for protected user endpoints:

1. Clear cached user profile.
2. Force re-authentication.
3. Refresh role-dependent UI after login.

## Suggested Integration Flow

### Web App

1. On app start: call `GET /api/auth/me`.
2. Load `GET /api/users/{id}/details` into profile state.
3. On profile save: call `PATCH /api/users/{id}/profile` with changed fields only.
4. Render backend field errors from `details.fields[]`.

### Mobile App

1. On session restore: validate token via existing authenticated endpoint.
2. Fetch `GET /api/users/{id}/details` for profile screen hydration.
3. Use optimistic UI only for local state; always reconcile with server response payload.
4. On `401`, invalidate local session and navigate to login.

## Minimal Test Checklist for Frontends

- Create user with role/title and verify success.
- Update user role/title and verify validation behavior.
- Patch profile fields (`phone`, `preferredCurrency`, `address.*`) and verify persistence.
- Trigger a validation error (for example invalid phone format) and render field error.
- Trigger stale-token scenario (role change) and verify logout/re-auth flow.

## Local API Docs

- Swagger UI: `http://localhost:8888/api-docs`
