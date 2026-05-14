import { Router } from "express";
import { getExpiringProducts } from "../controllers/expiringProductsController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.get("/", authenticateToken, getExpiringProducts);

export default router;
