import { Router } from "express";
import {
  createCampaign,
  getCampaignPerformance,
  listAdvertisers,
  listCampaigns
} from "../controllers/retailMediaController";
import { authenticateToken } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";

const router = Router();

router.use(authenticateToken);
router.get("/advertisers", listAdvertisers);
router.get("/campaigns", listCampaigns);
router.get("/performance", getCampaignPerformance);
router.post("/campaigns", requireRole("ADMIN"), createCampaign);

export default router;
