import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";
import { buildEventFromRequest, logAuthEvent } from "../services/authAudit";

export function requireRole(...allowedRoles: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required"
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      await logAuthEvent(
        buildEventFromRequest(req, {
          action: "AUTHZ_ROLE_FORBIDDEN",
          outcome: "DENY",
          userId: req.user.userId,
          username: req.user.username,
          resource: `${req.method} ${req.originalUrl}`,
          message: `Role ${req.user.role} is not in [${allowedRoles.join(",")}]`,
          metadata: {
            role: req.user.role,
            allowedRoles
          }
        })
      );
      return res.status(403).json({
        message: "Forbidden: insufficient permissions"
      });
    }

    return next();
  };
}
