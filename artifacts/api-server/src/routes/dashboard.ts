import { Router } from "express";
import { db, productsTable, receiptsTable, deliveriesTable, transfersTable, warehousesTable, categoriesTable, stockLedgerTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/stats", requireAuth, async (_req, res) => {
  try {
    const products = await db.select().from(productsTable);
    const totalProducts = products.length;
    const lowStockItems = products.filter(p => p.currentStock > 0 && p.currentStock <= p.reorderThreshold).length;
    const outOfStockItems = products.filter(p => p.currentStock === 0).length;

    const receipts = await db.select().from(receiptsTable);
    const pendingReceipts = receipts.filter(r => r.status === "waiting" || r.status === "ready" || r.status === "draft").length;

    const deliveries = await db.select().from(deliveriesTable);
    const pendingDeliveries = deliveries.filter(d => d.status === "waiting" || d.status === "ready" || d.status === "draft").length;

    const transfers = await db.select().from(transfersTable);
    const scheduledTransfers = transfers.filter(t => t.status === "waiting" || t.status === "ready" || t.status === "draft").length;

    const warehouses = await db.select().from(warehousesTable);
    const totalWarehouses = warehouses.length;

    res.json({
      totalProducts,
      lowStockItems,
      outOfStockItems,
      pendingReceipts,
      pendingDeliveries,
      scheduledTransfers,
      totalWarehouses,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/stock-distribution", requireAuth, async (_req, res) => {
  try {
    const products = await db.select().from(productsTable);
    const categories = await db.select().from(categoriesTable);

    const totalStock = products.reduce((sum, p) => sum + p.currentStock, 0);
    const distribution: { category: string; quantity: number; percentage: number }[] = [];

    // Group by category
    const catMap = new Map<string, number>();
    for (const p of products) {
      const catName = p.categoryId
        ? (categories.find(c => c.id === p.categoryId)?.name ?? "Uncategorized")
        : "Uncategorized";
      catMap.set(catName, (catMap.get(catName) ?? 0) + p.currentStock);
    }

    for (const [category, quantity] of catMap.entries()) {
      distribution.push({
        category,
        quantity,
        percentage: totalStock > 0 ? Math.round((quantity / totalStock) * 100) : 0,
      });
    }

    res.json(distribution.sort((a, b) => b.quantity - a.quantity));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/recent-operations", requireAuth, async (_req, res) => {
  try {
    const entries = await db.select().from(stockLedgerTable)
      .orderBy(desc(stockLedgerTable.timestamp))
      .limit(10);

    const enriched = await Promise.all(entries.map(async (entry) => {
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

router.get("/low-stock", requireAuth, async (_req, res) => {
  try {
    const products = await db.select().from(productsTable);
    const categories = await db.select().from(categoriesTable);
    const warehouses = await db.select().from(warehousesTable);

    const lowStock = products
      .filter(p => p.currentStock <= p.reorderThreshold)
      .map(p => ({
        ...p,
        categoryName: p.categoryId ? categories.find(c => c.id === p.categoryId)?.name : undefined,
        warehouseName: p.warehouseId ? warehouses.find(w => w.id === p.warehouseId)?.name : undefined,
        stockStatus: p.currentStock === 0 ? "out_of_stock" : "low_stock",
      }));

    res.json(lowStock);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
