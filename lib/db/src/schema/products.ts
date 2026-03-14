import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";
import { warehousesTable, locationsTable } from "./warehouses";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  unitOfMeasure: text("unit_of_measure").notNull().default("pcs"),
  currentStock: integer("current_stock").notNull().default(0),
  reorderThreshold: integer("reorder_threshold").notNull().default(10),
  warehouseId: integer("warehouse_id").references(() => warehousesTable.id),
  locationId: integer("location_id").references(() => locationsTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
