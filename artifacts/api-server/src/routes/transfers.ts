import { Router } from "express";
import { db, transfersTable, transferItemsTable, productsTable, locationsTable, stockLedgerTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { generateRefNo } from "../lib/auth.js";

const router = Router();

async function enrichTransfer(t: typeof transfersTable.$inferSelect) {
  const items = await db.select().from(transferItemsTable).where(eq(transferItemsTable.transferId, t.id));
  const enrichedItems = await Promise.all(items.map(async (item) => {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    return {
      ...item,
      productName: product?.name ?? "Unknown",
      sku: product?.sku ?? "",
      unitOfMeasure: product?.unitOfMeasure ?? "pcs",
    };
  }));

  const [srcLoc] = await db.select().from(locationsTable).where(eq(locationsTable.id, t.sourceLocationId));
  const [dstLoc] = await db.select().from(locationsTable).where(eq(locationsTable.id, t.destinationLocationId));

  return {
    ...t,
    sourceLocationName: srcLoc?.name ?? `Location ${t.sourceLocationId}`,
    destinationLocationName: dstLoc?.name ?? `Location ${t.destinationLocationId}`,
    items: enrichedItems,
  };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    let transfers = await db.select().from(transfersTable).orderBy(transfersTable.createdAt);
    if (status) transfers = transfers.filter(t => t.status === status);
    const enriched = await Promise.all(transfers.map(enrichTransfer));
    res.json(enriched.reverse());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { sourceLocationId, destinationLocationId, notes, items } = req.body;
    if (!sourceLocationId || !destinationLocationId || !items?.length) {
      res.status(400).json({ error: "Bad Request", message: "sourceLocationId, destinationLocationId, and items are required" });
      return;
    }
    const referenceNo = generateRefNo("TRF");
    const [transfer] = await db.insert(transfersTable).values({
      referenceNo, sourceLocationId, destinationLocationId, notes, status: "draft", createdById: req.user?.id,
    }).returning();

    for (const item of items) {
      await db.insert(transferItemsTable).values({ transferId: transfer.id, productId: item.productId, quantity: item.quantity });
    }

    res.status(201).json(await enrichTransfer(transfer));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [transfer] = await db.select().from(transfersTable).where(eq(transfersTable.id, id));
    if (!transfer) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.json(await enrichTransfer(transfer));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/:id/validate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [transfer] = await db.select().from(transfersTable).where(eq(transfersTable.id, id));
    if (!transfer) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    if (transfer.status === "done") {
      res.status(400).json({ error: "Bad Request", message: "Transfer already validated" });
      return;
    }

    const items = await db.select().from(transferItemsTable).where(eq(transferItemsTable.transferId, id));
    const [srcLoc] = await db.select().from(locationsTable).where(eq(locationsTable.id, transfer.sourceLocationId));
    const [dstLoc] = await db.select().from(locationsTable).where(eq(locationsTable.id, transfer.destinationLocationId));

    for (const item of items) {
      await db.insert(stockLedgerTable).values({
        operationType: "transfer",
        productId: item.productId,
        quantity: item.quantity,
        sourceLocation: srcLoc?.name ?? `Location ${transfer.sourceLocationId}`,
        destinationLocation: dstLoc?.name ?? `Location ${transfer.destinationLocationId}`,
        referenceDoc: transfer.referenceNo,
        userId: req.user?.id,
      });
    }

    const [updated] = await db.update(transfersTable)
      .set({ status: "done", updatedAt: new Date() })
      .where(eq(transfersTable.id, id))
      .returning();

    res.json(await enrichTransfer(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db.update(transfersTable)
      .set({ status: "canceled", updatedAt: new Date() })
      .where(eq(transfersTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.json(await enrichTransfer(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
