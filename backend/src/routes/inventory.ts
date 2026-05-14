import { Router } from "express";
import {
  createInventoryBatch,
  getInventory
} from "../controllers/inventoryController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.get("/", authenticateToken, getInventory);
router.post("/", authenticateToken, createInventoryBatch);

export default router;
