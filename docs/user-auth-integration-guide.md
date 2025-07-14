# MongoDB Authentication Integration Guide

This guide shows how to integrate the new MongoDB-based authentication system with refresh tokens into your existing application.

## 📁 New Files Created

### 1. User Model and Schema
```
src/infrastructure/database/models/user.model.ts
```
- Mongoose schema for user data
- Password hashing with bcrypt
- Refresh token management
- Role-based permissions

### 2. MongoDB User Repository
```
src/infrastructure/repositories/mongodb-user-repository.ts
```
- CRUD operations for users
- Refresh token management
- User search and filtering
- Statistics and analytics

### 3. Authentication Service
```
src/application/services/auth.service.ts
```
- Registration and login
- Access token and refresh token generation
- Token refresh functionality
- Password reset flow
- Session management

### 4. Updated Authentication Middleware
```
src/presentation/middleware/authentication.ts (updated)
```
- MongoDB integration
- Fallback to mock users in development
- New middleware functions for email verification, etc.

### 5. Authentication Controller
```
src/presentation/controllers/auth-controller.ts
```
- REST API endpoints for authentication
- Input validation
- Error handling

### 6. Authentication Routes
```
src/presentation/routes/auth-routes.ts
```
- Complete authentication API routes
- Validation middleware integration

### 7. User Management Controller & Routes
```
src/presentation/controllers/user-management-controller.ts
src/presentation/routes/user-management-routes.ts
```
- Admin functionality for user management
- Role and permission management

## 📋 Files to Update

### 1. Environment Configuration
Update your `.env` file with the new variables from `updated-env-config`:
```bash
# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_this_in_production
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d

# MongoDB Configuration
MONGODB_URI=mongodb://admin:password123@localhost:27017/productdb?authSource=admin
```

### 2. Service Container
Replace your existing service container with the updated version that includes:
- MongoDB connection initialization
- User repository registration
- Authentication service initialization
- All existing methods preserved

### 3. Validation Middleware
Add the authentication validation functions to your existing `validation.ts` file:
```typescript
// Add the validation functions from auth-validation-additions.ts
```

### 4. Main Routes
Update your main routes file to include authentication routes:
```typescript
// Add to src/presentation/routes/index.ts
import { createAuthRoutes } from "./auth-routes";
import { createUserManagementRoutes } from "./user-management-routes";

// Mount routes
router.use("/auth", createAuthRoutes());
router.use("/users", createUserManagementRoutes()); // Admin only
```

## 🚀 Installation Steps

### 1. Install Dependencies
```bash
npm install mongoose bcrypt jsonwebtoken
npm install --save-dev @types/bcrypt @types/jsonwebtoken
```

### 2. Database Setup
Your MongoDB is already configured in Docker. The new user collection will be created automatically.

### 3. Environment Variables
Update your `.env` file with the new JWT secrets and MongoDB configuration.

### 4. Code Integration
1. Add all the new files to your project
2. Update the existing files as mentioned above
3. Import and register the new services in your application

## 🔐 Authentication Flow

### Registration
```
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user"
}
```

### Login
```
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123"
}

Response:
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": { ... }
  }
}
```

### Refresh Token
```
POST /api/auth/refresh
{
  "refreshToken": "eyJ..."
}
```

### Protected Routes
```
Authorization: Bearer <accessToken>
```

## 🛡️ Security Features

### Access Tokens
- Short-lived (15 minutes)
- Contains user info and permissions
- Used for API authentication

### Refresh Tokens
- Long-lived (7 days)
- Stored in database
- Used to generate new access tokens
- Can be revoked

### Password Security
- Bcrypt hashing with salt rounds of 12
- Password strength validation
- Secure password reset flow

### Role-Based Access Control
- Admin: Full access (`*` permission)
- Moderator: Limited admin functions
- User: Basic access to chat and products

## 📱 API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh tokens
- `POST /auth/logout` - Logout (revoke refresh token)
- `POST /auth/logout-all` - Logout from all devices
- `GET /auth/profile` - Get user profile
- `PUT /auth/change-password` - Change password
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Confirm password reset

### User Management (Admin Only)
- `GET /users` - List all users
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `PUT /users/:id/role` - Update user role
- `PUT /users/:id/activate` - Activate user
- `PUT /users/:id/deactivate` - Deactivate user
- `DELETE /users/:id` - Delete user
- `POST /users/:id/clear-sessions` - Clear user sessions
- `GET /users/stats` - Get user statistics

## 🔄 Migration from Mock Users

The system maintains backward compatibility:
- Mock tokens still work in development mode
- Existing routes continue to function
- Gradual migration to MongoDB-based auth

## 🧪 Testing

### Development Mode
```typescript
// Mock tokens for testing
Authorization: Bearer mock-admin-token
Authorization: Bearer mock-user-token
Authorization: Bearer mock-moderator-token
```

### Production Mode
Use real JWT tokens from the authentication endpoints.

## 🚨 Important Notes

1. **JWT Secrets**: Change the default JWT secrets in production
2. **MongoDB Connection**: Ensure MongoDB is running and accessible
3. **Password Policy**: Implement additional password requirements as needed
4. **Rate Limiting**: Consider adding rate limiting to auth endpoints
5. **Email Service**: Implement email service for password reset functionality
6. **HTTPS**: Always use HTTPS in production for token security

## 📊 Monitoring

The system provides:
- User registration/login analytics
- Session management
- Failed authentication attempts tracking
- User role distribution statistics

This implementation provides a robust, secure authentication system that integrates seamlessly with your existing architecture while maintaining all current functionality.