import { Router } from "express";

import { ProductController } from "../controllers/product-controller";
import {
  validateCreateProduct,
  validateUpdateProduct,
  validateProductId,
  validateProductSearch,
} from "../middleware/validation";
// import { authenticate, authorize, adminOnly } from '../middleware/authentication';

export function createProductRoutes(
  productController: ProductController
): Router {
  const router = Router();

  // Search products (public)
  router.get(
    "/search",
    validateProductSearch,
    productController.searchProducts.bind(productController)
  );

  // Get product (public)
  router.get(
    "/:productId",
    validateProductId,
    productController.getProduct.bind(productController)
  );

  // Create product (admin only)
  router.post(
    "/",
    // authenticate,
    // adminOnly,
    validateCreateProduct,
    productController.createProduct.bind(productController)
  );

  // Update product (admin only)
  router.put(
    "/:productId",
    // authenticate,
    // adminOnly,
    validateProductId,
    validateUpdateProduct,
    productController.updateProduct.bind(productController)
  );

  // Delete product (admin only)
  router.delete(
    "/:productId",
    // authenticate,
    // adminOnly,
    validateProductId,
    productController.deleteProduct.bind(productController)
  );

  return router;
}
