import { Router } from "express";
import { getExpiringProducts } from "../controllers/expiringProductsController";

const router = Router();

router.get("/", getExpiringProducts);

export default router;