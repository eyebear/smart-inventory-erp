import { Router } from "express";
import {
  getWasteAnalytics,
  getWasteSummary,
  getAnalyticsAlerts
} from "../controllers/analyticsController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.get("/waste", authenticateToken, getWasteAnalytics);
router.get("/waste-summary", authenticateToken, getWasteSummary);
router.get("/alerts", authenticateToken, getAnalyticsAlerts);

export default router;
