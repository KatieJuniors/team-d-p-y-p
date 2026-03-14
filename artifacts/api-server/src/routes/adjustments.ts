import { Router } from "express";
import { db, adjustmentsTable, productsTable, locationsTable, stockLedgerTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { generateRefNo } from "../lib/auth.js";

const router = Router();

async function enrichAdjustment(a: typeof adjustmentsTable.$inferSelect) {
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, a.productId));
  let locationName: string | undefined;
  if (a.locationId) {
    const [loc] = await db.select().from(locationsTable).where(eq(locationsTable.id, a.locationId));
    locationName = loc?.name;
  }
  return {
    ...a,
    productName: product?.name ?? "Unknown",
    sku: product?.sku ?? "",
    locationName,
  };
}

router.get("/", requireAuth, async (_req, res) => {
  try {
    const adjustments = await db.select().from(adjustmentsTable).orderBy(adjustmentsTable.createdAt);
    const enriched = await Promise.all(adjustments.map(enrichAdjustment));
    res.json(enriched.reverse());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { productId, locationId, actualQuantity, reason } = req.body;
    if (productId === undefined || actualQuantity === undefined) {
      res.status(400).json({ error: "Bad Request", message: "productId and actualQuantity are required" });
      return;
    }

    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
    if (!product) {
      res.status(404).json({ error: "Not Found", message: "Product not found" });
      return;
    }

    const recordedQuantity = product.currentStock;
    const difference = actualQuantity - recordedQuantity;
    const referenceNo = generateRefNo("ADJ");

    const [adj] = await db.insert(adjustmentsTable).values({
      referenceNo,
      productId,
      locationId,
      recordedQuantity,
      actualQuantity,
      difference,
      reason,
      status: "draft",
      createdById: req.user?.id,
    }).returning();

    res.status(201).json(await enrichAdjustment(adj));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/:id/validate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [adj] = await db.select().from(adjustmentsTable).where(eq(adjustmentsTable.id, id));
    if (!adj) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    if (adj.status === "done") {
      res.status(400).json({ error: "Bad Request", message: "Adjustment already validated" });
      return;
    }

    // Update product stock
    await db.update(productsTable)
      .set({ currentStock: adj.actualQuantity, updatedAt: new Date() })
      .where(eq(productsTable.id, adj.productId));

    // Ledger entry
    await db.insert(stockLedgerTable).values({
      operationType: "adjustment",
      productId: adj.productId,
      quantity: adj.difference,
      sourceLocation: "Physical Count",
      destinationLocation: adj.locationId ? `Location ${adj.locationId}` : "Default",
      referenceDoc: adj.referenceNo,
      userId: req.user?.id,
    });

    const [updated] = await db.update(adjustmentsTable)
      .set({ status: "done" })
      .where(eq(adjustmentsTable.id, id))
      .returning();

    res.json(await enrichAdjustment(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
