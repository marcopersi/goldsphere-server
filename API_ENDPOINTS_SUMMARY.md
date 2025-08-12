# API Endpoints Summary - Order Management

## Order Retrieval APIs

We have successfully implemented comprehensive order retrieval APIs with proper user/admin access control:

### 1. `/orders/my` - User's Own Orders (Recommended for Users)
**Method:** GET  
**Authentication:** Required  
**Access:** All authenticated users  
**Purpose:** Simplified endpoint for users to retrieve their own orders

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by order status
- `type` (optional): Filter by order type

**Features:**
- Automatically filters to authenticated user's orders only
- Clean, simple interface
- No userId parameter needed (automatically inferred)
- Returns user context information

**Example Usage:**
```
GET /orders/my?page=1&limit=10&status=pending
```

### 2. `/orders/admin` - Admin-Only Comprehensive View
**Method:** GET  
**Authentication:** Required  
**Access:** Admin role only  
**Purpose:** Full administrative access to all orders with analytics

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by order status
- `type` (optional): Filter by order type
- `userId` (optional): Filter by specific user ID

**Features:**
- Access to all orders across all users
- Order statistics and analytics
- User information included in responses
- Administrative context tracking

**Example Usage:**
```
GET /orders/admin?userId=user123&status=completed
```

### 3. `/orders` - Smart Routing Endpoint
**Method:** GET  
**Authentication:** Required  
**Access:** All authenticated users (with role-based restrictions)  
**Purpose:** Intelligent routing based on user role and parameters

**Smart Behavior:**
- **Regular Users:** Automatically restricted to their own orders only
  - If they try to access other users' orders → 403 Forbidden
  - Suggests using `/orders/my` for better experience
- **Admins:** Full access to all orders with optional filtering

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by order status
- `type` (optional): Filter by order type
- `userId` (optional): Filter by user ID (admin only)

**Example Usage:**
```
# Regular user (automatically filtered to their orders)
GET /orders?status=pending

# Admin (can access all orders or filter by user)
GET /orders?userId=user123&status=completed
```

## Access Control Implementation

### Security Features:
1. **JWT Token Validation**: All endpoints require valid authentication
2. **Role-Based Access Control**: Admin vs regular user permissions enforced
3. **Automatic User Scoping**: Regular users can only see their own data
4. **Explicit Access Denied**: Clear error messages for unauthorized access attempts

### Response Context:
All endpoints include context information:
- `requestedBy`: Who made the request (role and identifier)
- `viewingOrdersFor`: Whose orders are being viewed
- `endpointType`: Type of access (admin-access, user-scoped)
- `suggestions`: Helpful guidance for better API usage

## Technical Implementation

### Service Layer Architecture:
- **OrderService**: Centralized business logic for order operations
  - `getOrdersByUserId()`: Unified method for filtered order retrieval
  - `mapDatabaseRowsToOrder()`: Consistent order object mapping
- **CalculationService**: Financial calculations (fees, taxes, totals)
- **ProductService**: Product validation and enrichment

### Benefits of Current Implementation:
1. **Code Reuse**: Single service method powers multiple endpoints
2. **Consistency**: Unified data structure and response format
3. **Security**: Multiple layers of access control
4. **Maintainability**: Business logic separated from route handlers
5. **Flexibility**: Different endpoints for different use cases
6. **User Experience**: Simple `/my` endpoint for common user operations

## Recommendation

For most client applications:
- **Regular Users**: Use `/orders/my` for the best experience
- **Admin Dashboards**: Use `/orders/admin` for comprehensive management
- **Generic/Legacy**: Use `/orders` for backward compatibility

The API design provides multiple access patterns while maintaining security and usability for both user types.
