import { Router } from "express";
import { db, locationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const warehouseId = req.query.warehouseId ? parseInt(req.query.warehouseId as string) : undefined;
    const query = db.select().from(locationsTable);
    const locations = warehouseId
      ? await query.where(eq(locationsTable.warehouseId, warehouseId))
      : await query;
    res.json(locations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { warehouseId, name, zone, rack } = req.body;
    if (!warehouseId || !name) {
      res.status(400).json({ error: "Bad Request", message: "warehouseId and name are required" });
      return;
    }
    const [loc] = await db.insert(locationsTable).values({ warehouseId, name, zone, rack }).returning();
    res.status(201).json(loc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(locationsTable).where(eq(locationsTable.id, id));
    res.json({ message: "Location deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
