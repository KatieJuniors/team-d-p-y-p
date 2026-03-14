import { Router } from "express";
import { db, deliveriesTable, deliveryItemsTable, productsTable, warehousesTable, stockLedgerTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { generateRefNo } from "../lib/auth.js";

const router = Router();

async function enrichDelivery(d: typeof deliveriesTable.$inferSelect) {
  const items = await db.select().from(deliveryItemsTable).where(eq(deliveryItemsTable.deliveryId, d.id));
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
  if (d.warehouseId) {
    const [wh] = await db.select().from(warehousesTable).where(eq(warehousesTable.id, d.warehouseId));
    warehouseName = wh?.name;
  }

  return { ...d, warehouseName, items: enrichedItems };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const { status, warehouseId } = req.query;
    let deliveries = await db.select().from(deliveriesTable).orderBy(deliveriesTable.createdAt);
    if (status) deliveries = deliveries.filter(d => d.status === status);
    if (warehouseId) deliveries = deliveries.filter(d => d.warehouseId === parseInt(warehouseId as string));
    const enriched = await Promise.all(deliveries.map(enrichDelivery));
    res.json(enriched.reverse());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { customer, warehouseId, notes, items } = req.body;
    if (!customer || !warehouseId || !items?.length) {
      res.status(400).json({ error: "Bad Request", message: "customer, warehouseId, and items are required" });
      return;
    }
    const referenceNo = generateRefNo("DEL");
    const [delivery] = await db.insert(deliveriesTable).values({
      referenceNo, customer, warehouseId, notes, status: "draft", createdById: req.user?.id,
    }).returning();

    for (const item of items) {
      await db.insert(deliveryItemsTable).values({ deliveryId: delivery.id, productId: item.productId, quantity: item.quantity });
    }

    res.status(201).json(await enrichDelivery(delivery));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [delivery] = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id));
    if (!delivery) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.json(await enrichDelivery(delivery));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { customer, warehouseId, notes, status, items } = req.body;
    const [delivery] = await db.update(deliveriesTable)
      .set({ customer, warehouseId, notes, status, updatedAt: new Date() })
      .where(eq(deliveriesTable.id, id))
      .returning();
    if (!delivery) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    if (items) {
      await db.delete(deliveryItemsTable).where(eq(deliveryItemsTable.deliveryId, id));
      for (const item of items) {
        await db.insert(deliveryItemsTable).values({ deliveryId: id, productId: item.productId, quantity: item.quantity });
      }
    }
    res.json(await enrichDelivery(delivery));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/:id/validate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [delivery] = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id));
    if (!delivery) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    if (delivery.status === "done") {
      res.status(400).json({ error: "Bad Request", message: "Delivery already validated" });
      return;
    }

    const items = await db.select().from(deliveryItemsTable).where(eq(deliveryItemsTable.deliveryId, id));

    // Decrease stock for each item
    for (const item of items) {
      const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
      if (product) {
        const newStock = Math.max(0, product.currentStock - item.quantity);
        await db.update(productsTable)
          .set({ currentStock: newStock, updatedAt: new Date() })
          .where(eq(productsTable.id, item.productId));

        await db.insert(stockLedgerTable).values({
          operationType: "delivery",
          productId: item.productId,
          quantity: -item.quantity,
          sourceLocation: delivery.warehouseId ? `Warehouse ${delivery.warehouseId}` : "Main",
          destinationLocation: delivery.customer,
          referenceDoc: delivery.referenceNo,
          userId: req.user?.id,
        });
      }
    }

    const [updated] = await db.update(deliveriesTable)
      .set({ status: "done", updatedAt: new Date() })
      .where(eq(deliveriesTable.id, id))
      .returning();

    res.json(await enrichDelivery(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db.update(deliveriesTable)
      .set({ status: "canceled", updatedAt: new Date() })
      .where(eq(deliveriesTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.json(await enrichDelivery(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
