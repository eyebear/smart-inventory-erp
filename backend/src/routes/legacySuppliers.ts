import { Router } from "express";
import { getLegacySuppliers } from "../controllers/legacySuppliersController";
import { authenticateToken } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";

const router = Router();

router.get("/", authenticateToken, requireRole("ADMIN"), getLegacySuppliers);

export default router;
