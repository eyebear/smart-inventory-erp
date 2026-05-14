import { Router } from "express";
import { getSuppliers } from "../controllers/suppliersController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.get("/", authenticateToken, getSuppliers);

export default router;
