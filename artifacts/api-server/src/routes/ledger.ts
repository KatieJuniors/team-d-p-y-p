import { Router } from "express";
import { db, stockLedgerTable, productsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const { productId, operationType, limit = "50", offset = "0" } = req.query;

    let entries = await db.select().from(stockLedgerTable)
      .orderBy(desc(stockLedgerTable.timestamp));

    if (productId) {
      entries = entries.filter(e => e.productId === parseInt(productId as string));
    }
    if (operationType) {
      entries = entries.filter(e => e.operationType === operationType);
    }

    const limited = entries.slice(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string));

    const enriched = await Promise.all(limited.map(async (entry) => {
      const [product] = await db.select().from(productsTable).where(eq(productsTable.id, entry.productId));
      let userName: string | undefined;
      if (entry.userId) {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, entry.userId));
        userName = user?.name;
      }
      return {
        ...entry,
        productName: product?.name ?? "Unknown",
        sku: product?.sku ?? "",
        userName,
      };
    }));

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
