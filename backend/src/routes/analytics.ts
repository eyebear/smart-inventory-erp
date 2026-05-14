import { Router } from "express";
import {
  getWasteAnalytics,
  getWasteSummary
} from "../controllers/analyticsController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.get("/waste", authenticateToken, getWasteAnalytics);
router.get("/waste-summary", authenticateToken, getWasteSummary);

export default router;
