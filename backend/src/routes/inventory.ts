import { Router } from "express";
import { getInventory } from "../controllers/inventoryController";

const router = Router();

router.get("/", getInventory);

export default router;