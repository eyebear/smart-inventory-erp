import { Response } from "express";
import { db } from "../config/database";
import { AuthRequest } from "../middleware/authMiddleware";

export const listAdvertisers = async (_req: AuthRequest, res: Response) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, industry, contact_email, created_at FROM advertisers ORDER BY name"
    );
    res.json(rows);
  } catch (error) {
    console.error("Failed to list advertisers:", error);
    res.status(500).json({ message: "Failed to list advertisers" });
  }
};

export const listCampaigns = async (_req: AuthRequest, res: Response) => {
  try {
    const [rows] = await db.query(`
      SELECT
        c.id,
        c.campaign_code,
        a.name AS advertiser_name,
        st.name AS store_name,
        c.region,
        c.channel,
        aus.name AS audience_segment,
        c.start_date,
        c.end_date,
        c.planned_budget,
        c.daily_budget,
        c.objective,
        c.status
      FROM campaigns c
      JOIN advertisers a ON a.id = c.advertiser_id
      LEFT JOIN stores st ON st.id = c.store_id
      LEFT JOIN audience_segments aus ON aus.id = c.audience_segment_id
      ORDER BY c.start_date DESC, c.campaign_code
    `);
    res.json(rows);
  } catch (error) {
    console.error("Failed to list campaigns:", error);
    res.status(500).json({ message: "Failed to list campaigns" });
  }
};

export const createCampaign = async (req: AuthRequest, res: Response) => {
  const {
    campaignCode,
    advertiserId,
    storeId,
    region,
    channel,
    audienceSegmentId,
    startDate,
    endDate,
    plannedBudget,
    dailyBudget,
    objective,
    status,
    productIds = []
  } = req.body ?? {};

  if (!campaignCode || !advertiserId || !channel || !startDate || !endDate) {
    return res.status(400).json({ message: "Missing required campaign fields" });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO campaigns (
        campaign_code, advertiser_id, store_id, region, channel,
        audience_segment_id, start_date, end_date, planned_budget,
        daily_budget, objective, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        campaignCode,
        advertiserId,
        storeId ?? null,
        region ?? null,
        channel,
        audienceSegmentId ?? null,
        startDate,
        endDate,
        Number(plannedBudget ?? 0),
        Number(dailyBudget ?? 0),
        objective ?? "CONVERSION",
        status ?? "DRAFT"
      ]
    );

    const campaignId = (result as { insertId: number }).insertId;
    for (const productId of productIds as number[]) {
      await connection.execute(
        `INSERT INTO campaign_products (campaign_id, product_id, promoted_sku)
         SELECT ?, id, sku FROM products WHERE id = ?`,
        [campaignId, productId]
      );
    }

    await connection.commit();
    res.status(201).json({ id: campaignId, campaignCode });
  } catch (error) {
    await connection.rollback();
    console.error("Failed to create campaign:", error);
    res.status(500).json({ message: "Failed to create campaign" });
  } finally {
    connection.release();
  }
};

export const getCampaignPerformance = async (_req: AuthRequest, res: Response) => {
  try {
    const [rows] = await db.query(`
      SELECT
        c.campaign_code,
        c.status,
        SUM(e.impressions) AS impressions,
        SUM(e.clicks) AS clicks,
        SUM(e.conversions) AS conversions,
        SUM(e.spend) AS spend,
        SUM(e.attributed_revenue) AS attributed_revenue,
        SUM(e.clicks) / NULLIF(SUM(e.impressions), 0) AS ctr,
        SUM(e.spend) / NULLIF(SUM(e.clicks), 0) AS cpc,
        SUM(e.spend) / NULLIF(SUM(e.conversions), 0) AS cpa,
        SUM(e.attributed_revenue) / NULLIF(SUM(e.spend), 0) AS roas
      FROM campaigns c
      LEFT JOIN campaign_daily_events e ON e.campaign_id = c.id
      GROUP BY c.id, c.campaign_code, c.status
      ORDER BY spend DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error("Failed to fetch campaign performance:", error);
    res.status(500).json({ message: "Failed to fetch campaign performance" });
  }
};
