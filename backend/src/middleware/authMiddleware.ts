import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthRequest = Request & {
  user?: {
    userId: number;
    username: string;
    role: string;
    storeId: number | null;
  };
};

type JwtPayload = {
  userId: number;
  username: string;
  role: string;
  storeId: number | null;
};

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Missing or invalid authorization header"
    });
  }

  const token = authHeader.split(" ")[1];
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return res.status(500).json({
      message: "JWT secret is not configured"
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      storeId: decoded.storeId
    };

    return next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
}