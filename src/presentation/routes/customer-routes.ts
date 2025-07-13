import { Router } from "express";

import { CustomerController } from "../controllers/customer-controller";
import {
  validateCreateCustomer,
  validateUpdateCustomer,
  validateCustomerId,
} from "../middleware/validation";

export function createCustomerRoutes(
  customerController: CustomerController
): Router {
  const router = Router();

  // Create customer
  router.post(
    "/",
    validateCreateCustomer,
    customerController.createCustomer.bind(customerController)
  );

  // Get customer
  router.get(
    "/:customerId",
    validateCustomerId,
    customerController.getCustomer.bind(customerController)
  );

  // Update customer
  router.put(
    "/:customerId",
    validateCustomerId,
    validateUpdateCustomer,
    customerController.updateCustomer.bind(customerController)
  );

  return router;
}
