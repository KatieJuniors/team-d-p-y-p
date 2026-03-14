import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";
import { locationsTable } from "./warehouses";
import { usersTable } from "./users";

export const adjustmentStatusEnum = pgEnum("adjustment_status", ["draft", "done"]);

export const adjustmentsTable = pgTable("adjustments", {
  id: serial("id").primaryKey(),
  referenceNo: text("reference_no").notNull().unique(),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  locationId: integer("location_id").references(() => locationsTable.id),
  recordedQuantity: integer("recorded_quantity").notNull(),
  actualQuantity: integer("actual_quantity").notNull(),
  difference: integer("difference").notNull(),
  reason: text("reason"),
  status: adjustmentStatusEnum("status").notNull().default("draft"),
  createdById: integer("created_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAdjustmentSchema = createInsertSchema(adjustmentsTable).omit({
  id: true,
  referenceNo: true,
  createdAt: true,
});
export type InsertAdjustment = z.infer<typeof insertAdjustmentSchema>;
export type Adjustment = typeof adjustmentsTable.$inferSelect;
