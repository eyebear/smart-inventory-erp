import { Router } from "express";
import { getStores } from "../controllers/storesController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.get("/", authenticateToken, getStores);

export default router;
