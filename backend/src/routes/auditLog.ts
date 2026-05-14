import { Router } from "express";
import { getAuditLog } from "../controllers/auditController";
import { authenticateToken } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";

const router = Router();

router.get("/", authenticateToken, requireRole("ADMIN"), getAuditLog);

export default router;
