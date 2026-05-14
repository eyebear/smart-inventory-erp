import { Request } from "express";
import { db } from "../config/database";

export type AuditOutcome = "SUCCESS" | "DENY" | "ERROR";

export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "AUTHN_MISSING_HEADER"
  | "AUTHN_INVALID_TOKEN"
  | "AUTHN_USER_INACTIVE"
  | "AUTHZ_ROLE_FORBIDDEN"
  | "AUTHZ_STORE_SCOPE_VIOLATION"
  | "PRODUCT_CREATE"
  | "INVENTORY_CREATE"
  | "AUDIT_LOG_VIEW";

export type AuditEvent = {
  action: AuditAction;
  outcome: AuditOutcome;
  userId?: number | null;
  username?: string | null;
  resource?: string | null;
  message?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
};

function pickClientIp(req: Request): string | null {
  const trustProxy = req.app.get("trust proxy");
  if (trustProxy) {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
      return forwarded.split(",")[0]?.trim() ?? null;
    }
  }
  return req.socket?.remoteAddress ?? req.ip ?? null;
}

export function buildEventFromRequest(
  req: Request,
  partial: Omit<AuditEvent, "ipAddress" | "userAgent"> &
    Partial<Pick<AuditEvent, "ipAddress" | "userAgent">>
): AuditEvent {
  return {
    ipAddress: partial.ipAddress ?? pickClientIp(req),
    userAgent: partial.userAgent ?? (req.headers["user-agent"] as string) ?? null,
    ...partial
  };
}

export async function logAuthEvent(event: AuditEvent): Promise<void> {
  try {
    await db.query(
      `
      INSERT INTO auth_audit_log
        (user_id, username, action, resource, outcome, ip_address, user_agent, message, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        event.userId ?? null,
        event.username ?? null,
        event.action,
        event.resource ?? null,
        event.outcome,
        event.ipAddress ?? null,
        event.userAgent ?? null,
        event.message ?? null,
        event.metadata ? JSON.stringify(event.metadata) : null
      ]
    );
  } catch (error) {
    // Audit logging must not break the request path. We log and move on.
    // Operators should alarm on auth_audit_log insert errors in monitoring.
    console.error("auth_audit_log insert failed", {
      action: event.action,
      outcome: event.outcome,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
