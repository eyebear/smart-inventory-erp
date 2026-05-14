import { Router } from "express";
import { createProduct, getProducts } from "../controllers/productController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.get("/", authenticateToken, getProducts);
router.post("/", authenticateToken, createProduct);

export default router;
