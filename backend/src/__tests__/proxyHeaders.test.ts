import express, { Request, Response, NextFunction } from "express";
import request from "supertest";

function buildProbe(trustProxy: boolean | number | string) {
  const probe = express();
  probe.set("trust proxy", trustProxy);
  probe.use((req: Request, _res: Response, next: NextFunction) => {
    if (!req.app.get("trust proxy") && "x-forwarded-proto" in req.headers) {
      delete req.headers["x-forwarded-proto"];
      delete req.headers["x-forwarded-for"];
      delete req.headers["x-forwarded-host"];
    }
    next();
  });
  probe.get("/info", (req, res) => {
    res.json({
      protocol: req.protocol,
      forwardedProto: req.headers["x-forwarded-proto"] ?? null,
      forwardedFor: req.headers["x-forwarded-for"] ?? null,
      forwardedHost: req.headers["x-forwarded-host"] ?? null
    });
  });
  return probe;
}

describe("Trust-proxy and X-Forwarded-Proto handling", () => {
  test("with trust proxy disabled, spoofed X-Forwarded-* headers are stripped", async () => {
    const probe = buildProbe(false);

    const response = await request(probe)
      .get("/info")
      .set("X-Forwarded-Proto", "https")
      .set("X-Forwarded-For", "1.2.3.4")
      .set("X-Forwarded-Host", "evil.example");

    expect(response.status).toBe(200);
    expect(response.body.forwardedProto).toBeNull();
    expect(response.body.forwardedFor).toBeNull();
    expect(response.body.forwardedHost).toBeNull();
    expect(response.body.protocol).toBe("http");
  });

  test("with trust proxy enabled, the proxy-set X-Forwarded-Proto is honored", async () => {
    const probe = buildProbe(1);

    const response = await request(probe)
      .get("/info")
      .set("X-Forwarded-Proto", "https");

    expect(response.body.protocol).toBe("https");
  });
});
