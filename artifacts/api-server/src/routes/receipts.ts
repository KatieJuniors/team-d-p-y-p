import { Router } from "express";
import { db, receiptsTable, receiptItemsTable, productsTable, warehousesTable, usersTable, stockLedgerTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { generateRefNo } from "../lib/auth.js";

const router = Router();

async function enrichReceipt(r: typeof receiptsTable.$inferSelect) {
  const items = await db.select().from(receiptItemsTable).where(eq(receiptItemsTable.receiptId, r.id));
  const enrichedItems = await Promise.all(items.map(async (item) => {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    return {
      ...item,
      productName: product?.name ?? "Unknown",
      sku: product?.sku ?? "",
      unitOfMeasure: product?.unitOfMeasure ?? "pcs",
    };
  }));

  let warehouseName: string | undefined;
  if (r.warehouseId) {
    const [wh] = await db.select().from(warehousesTable).where(eq(warehousesTable.id, r.warehouseId));
    warehouseName = wh?.name;
  }

  return { ...r, warehouseName, items: enrichedItems };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const { status, warehouseId } = req.query;
    let receipts = await db.select().from(receiptsTable).orderBy(receiptsTable.createdAt);
    if (status) receipts = receipts.filter(r => r.status === status);
    if (warehouseId) receipts = receipts.filter(r => r.warehouseId === parseInt(warehouseId as string));
    const enriched = await Promise.all(receipts.map(enrichReceipt));
    res.json(enriched.reverse());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { supplier, warehouseId, notes, items } = req.body;
    if (!supplier || !warehouseId || !items?.length) {
      res.status(400).json({ error: "Bad Request", message: "supplier, warehouseId, and items are required" });
      return;
    }
    const referenceNo = generateRefNo("REC");
    const [receipt] = await db.insert(receiptsTable).values({
      referenceNo, supplier, warehouseId, notes, status: "draft", createdById: req.user?.id,
    }).returning();

    for (const item of items) {
      await db.insert(receiptItemsTable).values({ receiptId: receipt.id, productId: item.productId, quantity: item.quantity });
    }

    res.status(201).json(await enrichReceipt(receipt));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [receipt] = await db.select().from(receiptsTable).where(eq(receiptsTable.id, id));
    if (!receipt) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.json(await enrichReceipt(receipt));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { supplier, warehouseId, notes, status, items } = req.body;
    const [receipt] = await db.update(receiptsTable)
      .set({ supplier, warehouseId, notes, status, updatedAt: new Date() })
      .where(eq(receiptsTable.id, id))
      .returning();
    if (!receipt) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    if (items) {
      await db.delete(receiptItemsTable).where(eq(receiptItemsTable.receiptId, id));
      for (const item of items) {
        await db.insert(receiptItemsTable).values({ receiptId: id, productId: item.productId, quantity: item.quantity });
      }
    }

    res.json(await enrichReceipt(receipt));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/:id/validate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [receipt] = await db.select().from(receiptsTable).where(eq(receiptsTable.id, id));
    if (!receipt) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    if (receipt.status === "done") {
      res.status(400).json({ error: "Bad Request", message: "Receipt already validated" });
      return;
    }

    const items = await db.select().from(receiptItemsTable).where(eq(receiptItemsTable.receiptId, id));

    // Increase stock for each item
    for (const item of items) {
      const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
      if (product) {
        await db.update(productsTable)
          .set({ currentStock: product.currentStock + item.quantity, updatedAt: new Date() })
          .where(eq(productsTable.id, item.productId));

        // Ledger entry
        await db.insert(stockLedgerTable).values({
          operationType: "receipt",
          productId: item.productId,
          quantity: item.quantity,
          sourceLocation: receipt.supplier,
          destinationLocation: receipt.warehouseId ? `Warehouse ${receipt.warehouseId}` : "Main",
          referenceDoc: receipt.referenceNo,
          userId: req.user?.id,
        });
      }
    }

    const [updated] = await db.update(receiptsTable)
      .set({ status: "done", updatedAt: new Date() })
      .where(eq(receiptsTable.id, id))
      .returning();

    res.json(await enrichReceipt(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db.update(receiptsTable)
      .set({ status: "canceled", updatedAt: new Date() })
      .where(eq(receiptsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.json(await enrichReceipt(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
