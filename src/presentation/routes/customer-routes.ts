import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { ServiceContainer } from '../../infrastructure';
import { CustomerController } from '../controllers/customer-controller';
import { authenticate, requireActiveAccount } from '../middleware/authentication';
import { handleValidationErrors } from '../middleware/validation';

export function createCustomerRoutes(customerController?: CustomerController): Router {
  const router = Router();

  // Get controller from service container or use provided one
  let controller: CustomerController;

  if (customerController) {
    controller = customerController;
  } else {
    const serviceContainer = ServiceContainer.getInstance();
    if (!serviceContainer.isServiceInitialized()) {
      throw new Error('ServiceContainer must be initialized before creating customer routes');
    }
    controller = serviceContainer.getCustomerController();
  }

  // ============================================================================
  // PUBLIC CUSTOMER ROUTES (no authentication required)
  // ============================================================================

  /**
   * @route POST /api/customers
   * @desc Create a new customer (public access for registration/onboarding)
   * @access Public
   * @body {string} name - Customer name (2-100 characters)
   * @body {string} email - Customer email address
   * @body {string} [phone] - Customer phone number (optional)
   */
  router.post(
    '/',
    [
      body('name')
        .isString()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
      body('email').isEmail().normalizeEmail().withMessage('Valid email address is required'),
      body('phone').optional().isMobilePhone('any').withMessage('Valid phone number is required'),
    ],
    handleValidationErrors,
    controller.createCustomer.bind(controller)
  );

  /**
   * @route GET /api/customers/health
   * @desc Customer service health check (public)
   * @access Public
   */
  router.get('/health', controller.healthCheck.bind(controller));

  /**
   * @route GET /api/customers/email/:email
   * @desc Get customer by email address (public for verification)
   * @access Public
   * @param {string} email - Customer email address
   */
  router.get(
    '/email/:email',
    [param('email').isEmail().withMessage('Valid email address is required')],
    handleValidationErrors,
    controller.getCustomerByEmail.bind(controller)
  );

  // ============================================================================
  // PROTECTED CUSTOMER ROUTES (authentication required)
  // ============================================================================

  /**
   * @route GET /api/customers
   * @desc Get all customers with pagination and filtering
   * @access Private (authenticated users)
   * @query {number} [page=1] - Page number
   * @query {number} [limit=20] - Number of customers per page (max 100)
   * @query {string} [search] - Search term for name, email, or phone
   * @query {boolean} [isActive] - Filter by active status
   */
  router.get(
    '/',
    authenticate,
    requireActiveAccount,
    [
      query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
      query('search')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Search term must be between 1 and 100 characters'),
      query('isActive').optional().isBoolean().withMessage('isActive must be a boolean value'),
    ],
    handleValidationErrors,
    controller.getAllCustomers.bind(controller)
  );

  /**
   * @route GET /api/customers/statistics
   * @desc Get customer statistics and analytics
   * @access Private (authenticated users)
   */
  router.get(
    '/statistics',
    authenticate,
    requireActiveAccount,
    controller.getStatistics.bind(controller)
  );

  /**
   * @route GET /api/customers/:customerId
   * @desc Get customer by ID
   * @access Private (authenticated users)
   * @param {string} customerId - Customer UUID
   */
  router.get(
    '/:customerId',
    authenticate,
    requireActiveAccount,
    [param('customerId').isUUID().withMessage('Customer ID must be a valid UUID')],
    handleValidationErrors,
    controller.getCustomer.bind(controller)
  );

  /**
   * @route PUT /api/customers/:customerId
   * @desc Update customer information
   * @access Private (authenticated users)
   * @param {string} customerId - Customer UUID
   * @body {string} [name] - Updated customer name
   * @body {string} [email] - Updated email address
   * @body {string} [phone] - Updated phone number
   */
  router.put(
    '/:customerId',
    authenticate,
    requireActiveAccount,
    [
      param('customerId').isUUID().withMessage('Customer ID must be a valid UUID'),
      body('name')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
      body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email address is required'),
      body('phone').optional().isMobilePhone('any').withMessage('Valid phone number is required'),
    ],
    handleValidationErrors,
    controller.updateCustomer.bind(controller)
  );

  /**
   * @route PUT /api/customers/:customerId/activate
   * @desc Activate customer account
   * @access Private (authenticated users)
   * @param {string} customerId - Customer UUID
   */
  router.put(
    '/:customerId/activate',
    authenticate,
    requireActiveAccount,
    [param('customerId').isUUID().withMessage('Customer ID must be a valid UUID')],
    handleValidationErrors,
    controller.activateCustomer.bind(controller)
  );

  /**
   * @route PUT /api/customers/:customerId/deactivate
   * @desc Deactivate customer account
   * @access Private (authenticated users)
   * @param {string} customerId - Customer UUID
   */
  router.put(
    '/:customerId/deactivate',
    authenticate,
    requireActiveAccount,
    [param('customerId').isUUID().withMessage('Customer ID must be a valid UUID')],
    handleValidationErrors,
    controller.deactivateCustomer.bind(controller)
  );

  /**
   * @route DELETE /api/customers/:customerId
   * @desc Delete customer (soft delete)
   * @access Private (authenticated users)
   * @param {string} customerId - Customer UUID
   */
  router.delete(
    '/:customerId',
    authenticate,
    requireActiveAccount,
    [param('customerId').isUUID().withMessage('Customer ID must be a valid UUID')],
    handleValidationErrors,
    controller.deleteCustomer.bind(controller)
  );

  // ============================================================================
  // BULK OPERATIONS (Protected)
  // ============================================================================

  /**
   * @route PUT /api/customers/bulk/activate
   * @desc Bulk activate multiple customers
   * @access Private (authenticated users)
   * @body {string[]} customerIds - Array of customer UUIDs (max 100)
   */
  router.put(
    '/bulk/activate',
    authenticate,
    requireActiveAccount,
    [
      body('customerIds')
        .isArray({ min: 1, max: 100 })
        .withMessage('Customer IDs must be an array with 1-100 items'),
      body('customerIds.*').isUUID().withMessage('Each customer ID must be a valid UUID'),
    ],
    handleValidationErrors,
    controller.bulkActivateCustomers.bind(controller)
  );

  /**
   * @route PUT /api/customers/bulk/deactivate
   * @desc Bulk deactivate multiple customers
   * @access Private (authenticated users)
   * @body {string[]} customerIds - Array of customer UUIDs (max 100)
   */
  router.put(
    '/bulk/deactivate',
    authenticate,
    requireActiveAccount,
    [
      body('customerIds')
        .isArray({ min: 1, max: 100 })
        .withMessage('Customer IDs must be an array with 1-100 items'),
      body('customerIds.*').isUUID().withMessage('Each customer ID must be a valid UUID'),
    ],
    handleValidationErrors,
    controller.bulkDeactivateCustomers.bind(controller)
  );

  return router;
}
