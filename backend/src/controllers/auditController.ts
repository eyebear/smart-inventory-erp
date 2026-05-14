import { Response } from "express";
import { db } from "../config/database";
import { AuthRequest } from "../middleware/authMiddleware";
import { buildEventFromRequest, logAuthEvent } from "../services/authAudit";

export const getAuditLog = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const limitRaw = Number(req.query.limit ?? 100);
  const limit =
    Number.isInteger(limitRaw) && limitRaw > 0 && limitRaw <= 500
      ? limitRaw
      : 100;

  try {
    const [rows] = await db.query(
      `
      SELECT
        id,
        user_id,
        username,
        action,
        resource,
        outcome,
        ip_address,
        user_agent,
        message,
        metadata,
        created_at
      FROM auth_audit_log
      ORDER BY id DESC
      LIMIT ?
      `,
      [limit]
    );

    await logAuthEvent(
      buildEventFromRequest(req, {
        action: "AUDIT_LOG_VIEW",
        outcome: "SUCCESS",
        userId: req.user.userId,
        username: req.user.username,
        metadata: { limit }
      })
    );

    return res.json(rows);
  } catch (error) {
    console.error("Failed to fetch audit log:", error);
    return res.status(500).json({ message: "Failed to fetch audit log" });
  }
};
