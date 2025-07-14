import { Router } from 'express';

import { AdminController } from '../controllers/admin-controller';
import { createAdminRateLimitMiddleware } from '../middleware';
import { adminOnly, authenticate } from '../middleware/authentication';
import { validateEmbeddingOptions, validateProductIds } from '../middleware/validation';

export function createAdminRoutes(adminController: AdminController): Router {
  const router = Router();
  const adminRateLimit = createAdminRateLimitMiddleware();

  // Apply authentication and admin-only access to all routes
  router.use(authenticate);
  router.use(adminOnly);
  router.use(adminRateLimit);

  // Initialize embeddings for all products
  router.post(
    '/embeddings/initialize',
    validateEmbeddingOptions,
    adminController.initializeEmbeddings.bind(adminController)
  );

  // Initialize embeddings for specific products
  router.post(
    '/embeddings/initialize-products',
    validateProductIds,
    adminController.initializeSpecificProducts.bind(adminController)
  );

  // Get embedding status
  router.get('/embeddings/status', adminController.getEmbeddingStatus.bind(adminController));

  // Validate embeddings
  router.get('/embeddings/validate', adminController.validateEmbeddings.bind(adminController));

  // Clear cache
  router.post('/cache/clear', adminController.clearCache.bind(adminController));

  return router;
}
