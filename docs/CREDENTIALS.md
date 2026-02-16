# Goldsphere Server Credentials

## System Users & Passwords

This file contains all system user credentials for development and testing. **KEEP SECURE - DO NOT COMMIT TO PUBLIC REPOS**

### Bank Technical User
- **Email**: `bank.technical@goldsphere.vault`
- **Password**: `GoldspherePassword`
- **Hash**: `$2b$10$Qpvbznj0phc/iumR0YcUVezf0eWV6wR0j34KxK/WLR1VwGv8Wgmj6`
- **Role**: Technical system user for banking operations
- **Usage**: API testing, automated scripts, technical integrations

### Admin User  
- **Email**: `admin@goldsphere.vault`
- **Password**: `admin123`
- **Hash**: `$2b$10$oWWBsW3k27.FHsrPkSp4quWD.hqcdk917aHcA9R4ITeU04uImejA2`
- **Role**: Administrative user
- **Usage**: System administration, user management

## Authentication Endpoints

### Login
```bash
curl -X POST "http://localhost:8888/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bank.technical@goldsphere.vault",
    "password": "GoldspherePassword"
  }'
```

### Response Format
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 86400,
    "expiresAt": "2026-01-11T18:47:04.702Z",
    "user": {
      "id": "user-uuid",
      "email": "bank.technical@goldsphere.vault",
      "firstName": "Bank",
      "lastName": "Technical",
      "role": "investor"
    }
  }
}
```

## Security Notes

1. **Password Policy**: Use strong passwords in production
2. **Token Expiry**: JWT tokens expire in 24 hours
3. **Hash Algorithm**: bcrypt with 10 salt rounds
4. **Environment**: These credentials are for development/testing only

## Last Updated
- **Date**: August 12, 2025
- **Updated By**: AI Assistant
- **Reason**: Standardized bank tech user password to "GoldspherePassword"
- **Status**: ✅ FULLY WORKING - All authentication tests pass
- **Database**: ✅ Recreated with correct password hashes
- **Scripts**: ✅ Updated to use new credentials helper system
