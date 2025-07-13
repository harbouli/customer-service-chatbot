import { Router } from "express";

import { AnalyticsController } from "../controllers/AnalyticsController";
import { authenticate, authorize } from "../middleware/authentication";

export function createAnalyticsRoutes(
  analyticsController: AnalyticsController
): Router {
  const router = Router();

  // Get chat analytics (admin only)
  router.get(
    "/chat",
    authenticate,
    authorize("admin"),
    analyticsController.getChatAnalytics.bind(analyticsController)
  );

  // Get product analytics (admin only)
  router.get(
    "/products",
    authenticate,
    authorize("admin"),
    analyticsController.getProductAnalytics.bind(analyticsController)
  );

  // Get system metrics (admin only)
  router.get(
    "/metrics",
    authenticate,
    authorize("admin"),
    analyticsController.getSystemMetrics.bind(analyticsController)
  );

  // Health status (public)
  router.get(
    "/health",
    analyticsController.getHealthStatus.bind(analyticsController)
  );

  return router;
}
