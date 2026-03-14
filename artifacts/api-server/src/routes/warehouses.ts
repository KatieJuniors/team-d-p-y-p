import { Router } from "express";
import { db, warehousesTable, locationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

// Warehouses
router.get("/", requireAuth, async (_req, res) => {
  try {
    const warehouses = await db.select().from(warehousesTable).orderBy(warehousesTable.name);
    const locations = await db.select().from(locationsTable);
    const result = warehouses.map(w => ({
      ...w,
      locations: locations.filter(l => l.warehouseId === w.id),
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, address, capacity, status = "active" } = req.body;
    if (!name) {
      res.status(400).json({ error: "Bad Request", message: "Name is required" });
      return;
    }
    const [wh] = await db.insert(warehousesTable).values({ name, address, capacity, status }).returning();
    res.status(201).json({ ...wh, locations: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, address, capacity, status } = req.body;
    const [wh] = await db.update(warehousesTable).set({ name, address, capacity, status }).where(eq(warehousesTable.id, id)).returning();
    if (!wh) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    const locations = await db.select().from(locationsTable).where(eq(locationsTable.warehouseId, id));
    res.json({ ...wh, locations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(warehousesTable).where(eq(warehousesTable.id, id));
    res.json({ message: "Warehouse deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
