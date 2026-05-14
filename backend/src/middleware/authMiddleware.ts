import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_ALGORITHM, getPublicKey } from "../config/jwtKeys";
import { findActiveUserById } from "../services/authService";
import { buildEventFromRequest, logAuthEvent } from "../services/authAudit";

export type AuthRequest = Request & {
  user?: {
    userId: number;
    username: string;
    role: string;
    storeId: number | null;
  };
};

type JwtClaims = {
  sub: string;
  username?: string;
};

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    await logAuthEvent(
      buildEventFromRequest(req, {
        action: "AUTHN_MISSING_HEADER",
        outcome: "DENY",
        resource: `${req.method} ${req.originalUrl}`,
        message: "Missing or malformed Authorization header"
      })
    );
    return res.status(401).json({
      message: "Missing or invalid authorization header"
    });
  }

  const token = authHeader.split(" ")[1];

  let publicKey: string;
  try {
    publicKey = getPublicKey();
  } catch (error) {
    console.error("JWT public key unavailable:", error);
    return res.status(500).json({
      message: "JWT verification key is not configured"
    });
  }

  let claims: JwtClaims;
  try {
    claims = jwt.verify(token, publicKey, {
      algorithms: [JWT_ALGORITHM],
      issuer: "smart-inventory-erp",
      audience: "smart-inventory-erp-clients"
    }) as JwtClaims;
  } catch (error) {
    await logAuthEvent(
      buildEventFromRequest(req, {
        action: "AUTHN_INVALID_TOKEN",
        outcome: "DENY",
        resource: `${req.method} ${req.originalUrl}`,
        message:
          error instanceof Error ? error.message : "Token verification failed"
      })
    );
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }

  const userId = Number(claims.sub);
  if (!Number.isInteger(userId) || userId <= 0) {
    await logAuthEvent(
      buildEventFromRequest(req, {
        action: "AUTHN_INVALID_TOKEN",
        outcome: "DENY",
        resource: `${req.method} ${req.originalUrl}`,
        message: "Invalid token subject",
        metadata: { sub: claims.sub }
      })
    );
    return res.status(401).json({
      message: "Invalid token subject"
    });
  }

  let user;
  try {
    user = await findActiveUserById(userId);
  } catch (error) {
    console.error("Failed to refresh user from DB:", error);
    return res.status(500).json({
      message: "Failed to verify user"
    });
  }

  if (!user) {
    await logAuthEvent(
      buildEventFromRequest(req, {
        action: "AUTHN_USER_INACTIVE",
        outcome: "DENY",
        userId,
        username: claims.username ?? null,
        resource: `${req.method} ${req.originalUrl}`,
        message: "User is missing or deactivated"
      })
    );
    return res.status(401).json({
      message: "User is no longer active"
    });
  }

  req.user = {
    userId: user.id,
    username: user.username,
    role: user.role,
    storeId: user.store_id
  };

  return next();
}
