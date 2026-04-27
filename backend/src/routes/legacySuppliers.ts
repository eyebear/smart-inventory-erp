import { Router } from "express";
import { getLegacySuppliers } from "../controllers/legacySuppliersController";

const router = Router();

router.get("/", getLegacySuppliers);

export default router;