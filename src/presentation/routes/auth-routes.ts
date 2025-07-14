import { Router } from 'express';
import { AuthController } from '../controllers/auth-controller';
import { authenticate, requireActiveAccount } from '../middleware/authentication';
import {
  validateLogin,
  validatePasswordChange,
  validatePasswordReset,
  validateRegister,
} from '../middleware/validation';

export function createAuthRoutes(): Router {
  const router = Router();
  const authController = new AuthController();

  // Public routes (no authentication required)

  /**
   * @route POST /auth/register
   * @desc Register a new user
   * @access Public
   */
  router.post('/register', validateRegister, authController.register.bind(authController));

  /**
   * @route POST /auth/login
   * @desc Login user
   * @access Public
   */
  router.post('/login', validateLogin, authController.login.bind(authController));

  /**
   * @route POST /auth/refresh
   * @desc Refresh access token using refresh token
   * @access Public
   */
  router.post('/refresh', authController.refreshToken.bind(authController));

  /**
   * @route POST /auth/forgot-password
   * @desc Request password reset
   * @access Public
   */
  router.post('/forgot-password', authController.requestPasswordReset.bind(authController));

  /**
   * @route POST /auth/reset-password
   * @desc Confirm password reset with token
   * @access Public
   */
  router.post(
    '/reset-password',
    validatePasswordReset,
    authController.confirmPasswordReset.bind(authController)
  );

  // Protected routes (authentication required)

  /**
   * @route GET /auth/profile
   * @desc Get current user profile
   * @access Private
   */
  router.get(
    '/profile',
    authenticate,
    requireActiveAccount,
    authController.getProfile.bind(authController)
  );

  /**
   * @route GET /auth/validate
   * @desc Validate current access token
   * @access Private
   */
  router.get(
    '/validate',
    authenticate,
    requireActiveAccount,
    authController.validateToken.bind(authController)
  );

  /**
   * @route POST /auth/logout
   * @desc Logout user (revoke specific refresh token)
   * @access Private
   */
  router.post('/logout', authenticate, authController.logout.bind(authController));

  /**
   * @route POST /auth/logout-all
   * @desc Logout user from all devices (revoke all refresh tokens)
   * @access Private
   */
  router.post('/logout-all', authenticate, authController.logoutAllDevices.bind(authController));

  /**
   * @route PUT /auth/change-password
   * @desc Change user password
   * @access Private
   */
  router.put(
    '/change-password',
    authenticate,
    requireActiveAccount,
    validatePasswordChange,
    authController.changePassword.bind(authController)
  );

  return router;
}
