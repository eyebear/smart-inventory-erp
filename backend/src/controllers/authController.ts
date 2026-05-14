import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { validateUser } from "../services/authService";
import { AuthRequest } from "../middleware/authMiddleware";
import { JWT_ALGORITHM, getPrivateKey } from "../config/jwtKeys";
import { buildEventFromRequest, logAuthEvent } from "../services/authAudit";

export const login = async (req: Request, res: Response) => {
  const username = typeof req.body?.username === "string" ? req.body.username : null;
  const password = typeof req.body?.password === "string" ? req.body.password : null;

  try {
    if (!username || !password) {
      await logAuthEvent(
        buildEventFromRequest(req, {
          action: "LOGIN_FAILURE",
          outcome: "DENY",
          username,
          message: "Missing credentials"
        })
      );
      return res.status(400).json({
        message: "Username and password are required"
      });
    }

    const user = await validateUser(username, password);

    if (!user) {
      await logAuthEvent(
        buildEventFromRequest(req, {
          action: "LOGIN_FAILURE",
          outcome: "DENY",
          username,
          message: "Invalid username or password / inactive user"
        })
      );
      return res.status(401).json({
        message: "Invalid username or password"
      });
    }

    let privateKey: string;
    try {
      privateKey = getPrivateKey();
    } catch (error) {
      console.error("JWT private key unavailable:", error);
      return res.status(500).json({
        message: "JWT signing key is not configured"
      });
    }

    const token = jwt.sign(
      {
        sub: String(user.id),
        username: user.username
      },
      privateKey,
      {
        algorithm: JWT_ALGORITHM,
        expiresIn: "2h",
        issuer: "smart-inventory-erp",
        audience: "smart-inventory-erp-clients"
      }
    );

    await logAuthEvent(
      buildEventFromRequest(req, {
        action: "LOGIN_SUCCESS",
        outcome: "SUCCESS",
        userId: user.id,
        username: user.username,
        metadata: { role: user.role, storeId: user.store_id }
      })
    );

    return res.json({
      token,
      user
    });
  } catch (error) {
    console.error("Login failed:", error);
    await logAuthEvent(
      buildEventFromRequest(req, {
        action: "LOGIN_FAILURE",
        outcome: "ERROR",
        username,
        message: error instanceof Error ? error.message : "Unknown error"
      })
    );

    return res.status(500).json({
      message: "Login failed"
    });
  }
};

export const me = (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required"
    });
  }

  return res.json({
    user: {
      id: req.user.userId,
      username: req.user.username,
      role: req.user.role,
      store_id: req.user.storeId
    }
  });
};
