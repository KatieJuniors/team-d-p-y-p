import { Router } from "express";
import { db, productsTable, categoriesTable, warehousesTable, locationsTable, stockLedgerTable } from "@workspace/db";
import { eq, and, like, or, SQL, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";

const router = Router();

function getStockStatus(currentStock: number, reorderThreshold: number): string {
  if (currentStock === 0) return "out_of_stock";
  if (currentStock <= reorderThreshold) return "low_stock";
  return "in_stock";
}

async function enrichProduct(p: typeof productsTable.$inferSelect) {
  let categoryName: string | undefined;
  let warehouseName: string | undefined;
  let locationName: string | undefined;

  if (p.categoryId) {
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, p.categoryId));
    categoryName = cat?.name;
  }
  if (p.warehouseId) {
    const [wh] = await db.select().from(warehousesTable).where(eq(warehousesTable.id, p.warehouseId));
    warehouseName = wh?.name;
  }
  if (p.locationId) {
    const [loc] = await db.select().from(locationsTable).where(eq(locationsTable.id, p.locationId));
    locationName = loc?.name;
  }

  return {
    ...p,
    categoryName,
    warehouseName,
    locationName,
    stockStatus: getStockStatus(p.currentStock, p.reorderThreshold),
  };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const { search, categoryId, warehouseId, status } = req.query;
    let products = await db.select().from(productsTable);

    if (search) {
      const s = (search as string).toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s));
    }
    if (categoryId) {
      products = products.filter(p => p.categoryId === parseInt(categoryId as string));
    }
    if (warehouseId) {
      products = products.filter(p => p.warehouseId === parseInt(warehouseId as string));
    }

    const enriched = await Promise.all(products.map(enrichProduct));

    if (status) {
      return res.json(enriched.filter(p => p.stockStatus === status));
    }

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, sku, categoryId, unitOfMeasure, initialStock = 0, warehouseId, locationId, reorderThreshold = 10 } = req.body;
    if (!name || !sku || !unitOfMeasure) {
      res.status(400).json({ error: "Bad Request", message: "name, sku, unitOfMeasure are required" });
      return;
    }

    const [product] = await db.insert(productsTable).values({
      name, sku, categoryId, unitOfMeasure,
      currentStock: initialStock,
      warehouseId, locationId, reorderThreshold,
    }).returning();

    // Log initial stock if any
    if (initialStock > 0) {
      await db.insert(stockLedgerTable).values({
        operationType: "receipt",
        productId: product.id,
        quantity: initialStock,
        destinationLocation: locationId ? `Location ${locationId}` : "Default",
        referenceDoc: `INIT-${product.sku}`,
        userId: req.user?.id,
      });
    }

    res.status(201).json(await enrichProduct(product));
  } catch (err: any) {
    console.error(err);
    if (err.code === "23505") {
      res.status(400).json({ error: "Bad Request", message: "SKU already exists" });
      return;
    }
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!product) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.json(await enrichProduct(product));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, sku, categoryId, unitOfMeasure, warehouseId, locationId, reorderThreshold } = req.body;
    const [product] = await db.update(productsTable)
      .set({ name, sku, categoryId, unitOfMeasure, warehouseId, locationId, reorderThreshold, updatedAt: new Date() })
      .where(eq(productsTable.id, id))
      .returning();
    if (!product) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.json(await enrichProduct(product));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(productsTable).where(eq(productsTable.id, id));
    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
