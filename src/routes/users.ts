/**
 * User Routes
 * 
 * REST API endpoints for user management.
 * Uses UserService for all business logic - no direct SQL queries.
 */

import { Router, Request, Response } from 'express';
import { getPool } from '../dbConfig';
import { UuidSchema } from '@marcopersi/shared';
import { 
  UserServiceFactory, 
  UserErrorCode,
  UserRole,
  isValidUserRole,
} from '../services/user';

const router = Router();

// Lazy service creation - uses singleton pool
function getUserService() {
  return UserServiceFactory.createUserService(getPool());
}

/**
 * GET /api/users
 * List all users with pagination, filtering, and sorting
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const userService = getUserService();
    
    const sortByParam = req.query.sortBy as string;
    const validSortBy = ['email', 'createdAt', 'updatedAt', 'lastLogin'].includes(sortByParam) 
      ? sortByParam as 'email' | 'createdAt' | 'updatedAt' | 'lastLogin'
      : 'email';

    const options = {
      page: Number.parseInt(req.query.page as string) || 1,
      limit: Math.min(Number.parseInt(req.query.limit as string) || 20, 100),
      search: req.query.search as string | undefined,
      role: isValidUserRole(req.query.role as string) ? req.query.role as UserRole : undefined,
      sortBy: validSortBy,
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc',
    };

    const result = await userService.getUsers(options);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: result.data!.users.map(user => ({
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      pagination: result.data!.pagination,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch users', 
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate user ID
    const idValidation = UuidSchema.safeParse(id);
    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
      });
    }

    const userService = getUserService();
    const result = await userService.getUserById(id);

    if (!result.success) {
      const status = result.errorCode === UserErrorCode.USER_NOT_FOUND ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: result.error,
      });
    }
    
    res.json({
      success: true,
      data: {
        id: result.data!.id,
        email: result.data!.email,
        role: result.data!.role,
        emailVerified: result.data!.emailVerified,
        createdAt: result.data!.createdAt,
        updatedAt: result.data!.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch user', 
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/users/:id/details
 * Get user with full details (profile, address, verification)
 */
router.get('/users/:id/details', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const idValidation = UuidSchema.safeParse(id);
    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
      });
    }

    const userService = getUserService();
    const result = await userService.getUserWithDetails(id);

    if (!result.success) {
      const status = result.errorCode === UserErrorCode.USER_NOT_FOUND ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: result.error,
      });
    }
    
    const { user, profile, address, verificationStatus } = result.data!;
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          identityVerified: user.identityVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        profile: profile ? {
          title: profile.title,
          firstName: profile.firstName,
          lastName: profile.lastName,
          birthDate: profile.birthDate,
        } : null,
        address: address ? {
          countryId: address.countryId,
          postalCode: address.postalCode,
          city: address.city,
          state: address.state,
          street: address.street,
        } : null,
        verificationStatus: verificationStatus ? {
          emailStatus: verificationStatus.emailVerificationStatus,
          identityStatus: verificationStatus.identityVerificationStatus,
        } : null,
      },
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch user details', 
      details: (error as Error).message,
    });
  }
});

/**
 * POST /api/users
 * Create new user
 */
router.post('/users', async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const userService = getUserService();
    const result = await userService.createUser({
      email,
      password,
      role: isValidUserRole(role) ? role : undefined,
    });

    if (!result.success) {
      const status = mapErrorCodeToStatus(result.errorCode);
      return res.status(status).json({
        success: false,
        error: result.error,
        code: result.errorCode,
      });
    }
    
    res.status(201).json({
      success: true,
      data: {
        id: result.data!.id,
        email: result.data!.email,
        role: result.data!.role,
        createdAt: result.data!.createdAt,
      },
      message: 'User created successfully',
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create user', 
      details: (error as Error).message,
    });
  }
});

/**
 * PUT /api/users/:id
 * Update user
 */
router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const idValidation = UuidSchema.safeParse(id);
    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
      });
    }

    const { email, password, role, emailVerified, identityVerified } = req.body;

    // Check if any update fields provided
    if (!email && !password && role === undefined && emailVerified === undefined && identityVerified === undefined) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields provided for update',
      });
    }

    const userService = getUserService();
    const result = await userService.updateUser(id, {
      email,
      password,
      role: isValidUserRole(role) ? role : undefined,
      emailVerified,
      identityVerified,
    });

    if (!result.success) {
      const status = mapErrorCodeToStatus(result.errorCode);
      return res.status(status).json({
        success: false,
        error: result.error,
        code: result.errorCode,
      });
    }
    
    res.json({
      success: true,
      data: {
        id: result.data!.id,
        email: result.data!.email,
        role: result.data!.role,
        emailVerified: result.data!.emailVerified,
        updatedAt: result.data!.updatedAt,
      },
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update user', 
      details: (error as Error).message,
    });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user (with dependency check)
 */
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const idValidation = UuidSchema.safeParse(id);
    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
      });
    }

    const userService = getUserService();
    
    // Get user email for response message before deletion
    const userResult = await userService.getUserById(id);
    const userEmail = userResult.success ? userResult.data!.email : 'Unknown';
    
    const result = await userService.deleteUser(id);

    if (!result.success) {
      const status = mapErrorCodeToStatus(result.errorCode);
      return res.status(status).json({
        success: false,
        error: result.error,
        code: result.errorCode,
      });
    }
    
    res.json({
      success: true,
      message: `User '${userEmail}' deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete user', 
      details: (error as Error).message,
    });
  }
});

/**
 * Map UserErrorCode to HTTP status code
 */
function mapErrorCodeToStatus(errorCode?: UserErrorCode): number {
  switch (errorCode) {
    case UserErrorCode.USER_NOT_FOUND:
      return 404;
    case UserErrorCode.EMAIL_ALREADY_EXISTS:
      return 409;
    case UserErrorCode.USER_HAS_DEPENDENCIES:
      return 409;
    case UserErrorCode.INVALID_EMAIL_FORMAT:
    case UserErrorCode.INVALID_PASSWORD:
    case UserErrorCode.VALIDATION_ERROR:
      return 400;
    case UserErrorCode.UNAUTHORIZED:
      return 401;
    default:
      return 500;
  }
}

export default router;
