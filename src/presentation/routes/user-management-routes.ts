/* eslint-disable @typescript-eslint/no-unused-vars */
// src/presentation/routes/user-management-routes.ts
import { Request, Response, Router } from 'express';
import { UserManagementController } from '../controllers/user-management-controller';
import { adminOnly, authenticate, moderatorOrAdmin } from '../middleware/authentication';
import {
  handleValidationErrors,
  validateUpdateUserProfile,
  validateUpdateUserRole,
  validateUserId,
  validateUserSearch,
} from '../middleware/validation';

export function createUserManagementRoutes(): Router {
  const router: Router = Router();
  const userController = new UserManagementController();

  // All routes require authentication
  router.use(authenticate);

  /**
   * @route GET /users
   * @desc Get all users (with filtering and pagination)
   * @access Admin, Moderator
   * @query {string} [search] - Search term for name/email
   * @query {string} [role] - Filter by role (admin, user, moderator)
   * @query {boolean} [isActive] - Filter by active status
   * @query {boolean} [emailVerified] - Filter by email verification status
   * @query {number} [page=1] - Page number
   * @query {number} [limit=10] - Items per page
   */
  router.get(
    '/',
    moderatorOrAdmin,
    validateUserSearch,
    handleValidationErrors,
    userController.getAllUsers.bind(userController)
  );

  /**
   * @route GET /users/stats
   * @desc Get user statistics
   * @access Admin only
   */
  router.get('/stats', adminOnly, userController.getUserStats.bind(userController));

  /**
   * @route GET /users/:userId
   * @desc Get user by ID
   * @access Admin, Moderator
   * @param {string} userId - MongoDB ObjectId of the user
   */
  router.get(
    '/:userId',
    moderatorOrAdmin,
    validateUserId,
    handleValidationErrors,
    userController.getUserById.bind(userController)
  );

  /**
   * @route PUT /users/:userId
   * @desc Update user profile information
   * @access Admin, Moderator
   * @param {string} userId - MongoDB ObjectId of the user
   * @body {string} [firstName] - Updated first name
   * @body {string} [lastName] - Updated last name
   * @body {string} [email] - Updated email address
   * @body {boolean} [isActive] - Updated active status
   * @body {boolean} [emailVerified] - Updated email verification status
   */
  router.put(
    '/:userId',
    moderatorOrAdmin,
    validateUserId,
    validateUpdateUserProfile,
    handleValidationErrors,
    userController.updateUser.bind(userController)
  );

  /**
   * @route PUT /users/:userId/role
   * @desc Update user role and permissions
   * @access Admin only
   * @param {string} userId - MongoDB ObjectId of the user
   * @body {string} role - New role (admin, user, moderator)
   * @body {string[]} [permissions] - Custom permissions array
   */
  router.put(
    '/:userId/role',
    adminOnly,
    validateUpdateUserRole,
    handleValidationErrors,
    userController.updateUserRole.bind(userController)
  );

  /**
   * @route PUT /users/:userId/activate
   * @desc Activate user account
   * @access Admin only
   * @param {string} userId - MongoDB ObjectId of the user
   */
  router.put(
    '/:userId/activate',
    adminOnly,
    validateUserId,
    handleValidationErrors,
    userController.activateUser.bind(userController)
  );

  /**
   * @route PUT /users/:userId/deactivate
   * @desc Deactivate user account
   * @access Admin only
   * @param {string} userId - MongoDB ObjectId of the user
   */
  router.put(
    '/:userId/deactivate',
    adminOnly,
    validateUserId,
    handleValidationErrors,
    userController.deactivateUser.bind(userController)
  );

  /**
   * @route POST /users/:userId/clear-sessions
   * @desc Clear all user sessions (logout from all devices)
   * @access Admin only
   * @param {string} userId - MongoDB ObjectId of the user
   */
  router.post(
    '/:userId/clear-sessions',
    adminOnly,
    validateUserId,
    handleValidationErrors,
    userController.clearUserSessions.bind(userController)
  );

  /**
   * @route DELETE /users/:userId
   * @desc Delete user account permanently
   * @access Admin only
   * @param {string} userId - MongoDB ObjectId of the user
   */
  router.delete(
    '/:userId',
    adminOnly,
    validateUserId,
    handleValidationErrors,
    userController.deleteUser.bind(userController)
  );

  return router;
}

// Additional utility routes for user management
export function createUserUtilityRoutes(): Router {
  const router: Router = Router();

  // All routes require authentication
  router.use(authenticate);

  /**
   * @route GET /users/search/suggestions
   * @desc Get user search suggestions (for autocomplete)
   * @access Admin, Moderator
   * @query {string} q - Search query
   * @query {number} [limit=5] - Max suggestions to return
   */
  router.get(
    '/search/suggestions',
    moderatorOrAdmin,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { q } = req.query;

        if (!q || typeof q !== 'string') {
          res.status(400).json({
            success: false,
            message: 'Search query is required',
          });
          return;
        }

        // This would need to be implemented in the controller
        // For now, return empty suggestions
        res.status(200).json({
          success: true,
          data: {
            suggestions: [],
          },
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Failed to get user suggestions',
        });
      }
    }
  );

  /**
   * @route GET /users/export
   * @desc Export users data (CSV format)
   * @access Admin only
   * @query {string} [format=csv] - Export format
   * @query {string} [role] - Filter by role
   * @query {boolean} [isActive] - Filter by active status
   */
  router.get('/export', adminOnly, async (req: Request, res: Response): Promise<void> => {
    try {
      const { format = 'csv', role, isActive } = req.query;

      // This would need to be implemented in the controller
      // For now, return a placeholder response
      res.status(200).json({
        success: true,
        message: 'User export feature coming soon',
        data: {
          format,
          filters: { role, isActive },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to export users',
      });
    }
  });

  /**
   * @route POST /users/bulk-action
   * @desc Perform bulk actions on multiple users
   * @access Admin only
   * @body {string[]} userIds - Array of user IDs
   * @body {string} action - Action to perform (activate, deactivate, delete)
   */
  router.post('/bulk-action', adminOnly, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userIds, action } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'User IDs array is required',
        });
        return;
      }

      if (!action || !['activate', 'deactivate', 'delete'].includes(action)) {
        res.status(400).json({
          success: false,
          message: 'Valid action is required (activate, deactivate, delete)',
        });
        return;
      }

      // This would need to be implemented in the controller
      // For now, return a placeholder response
      res.status(200).json({
        success: true,
        message: `Bulk ${action} feature coming soon`,
        data: {
          userIds,
          action,
          affected: userIds.length,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk action',
      });
    }
  });

  return router;
}
