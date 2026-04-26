import { Router } from "express";
import jwt from "jsonwebtoken";
import { validateUser } from "../services/authService";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required"
      });
    }

    const user = await validateUser(username, password);

    if (!user) {
      return res.status(401).json({
        message: "Invalid username or password"
      });
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      return res.status(500).json({
        message: "JWT secret is not configured"
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        storeId: user.store_id
      },
      jwtSecret,
      { expiresIn: "2h" }
    );

    return res.json({
      token,
      user
    });
  } catch (error) {
    console.error("Login failed:", error);

    return res.status(500).json({
      message: "Login failed"
    });
  }
});

export default router;