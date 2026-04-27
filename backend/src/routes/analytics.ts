import { Router } from "express";
import {
  getWasteAnalytics,
  getWasteSummary
} from "../controllers/analyticsController";

const router = Router();

router.get("/waste", getWasteAnalytics);
router.get("/waste-summary", getWasteSummary);

export default router;