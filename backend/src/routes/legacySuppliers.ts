import { Router } from "express";
import { fetchLegacySuppliers } from "../services/legacySupplierService";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const suppliers = await fetchLegacySuppliers();

    res.json({
      source: "legacy-php-service",
      count: suppliers.length,
      data: suppliers
    });
  } catch (error) {
    console.error("Failed to fetch legacy suppliers:", error);

    res.status(502).json({
      status: "error",
      message: "Failed to fetch suppliers from legacy PHP service"
    });
  }
});

export default router;