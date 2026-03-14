import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { warehousesTable } from "./warehouses";
import { productsTable } from "./products";
import { usersTable } from "./users";
import { docStatusEnum } from "./receipts";

export const deliveriesTable = pgTable("deliveries", {
  id: serial("id").primaryKey(),
  referenceNo: text("reference_no").notNull().unique(),
  customer: text("customer").notNull(),
  warehouseId: integer("warehouse_id").references(() => warehousesTable.id),
  status: docStatusEnum("status").notNull().default("draft"),
  notes: text("notes"),
  createdById: integer("created_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const deliveryItemsTable = pgTable("delivery_items", {
  id: serial("id").primaryKey(),
  deliveryId: integer("delivery_id").notNull().references(() => deliveriesTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  quantity: integer("quantity").notNull(),
});

export const insertDeliverySchema = createInsertSchema(deliveriesTable).omit({
  id: true,
  referenceNo: true,
  createdAt: true,
  updatedAt: true,
});
export const insertDeliveryItemSchema = createInsertSchema(deliveryItemsTable).omit({ id: true });

export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type Delivery = typeof deliveriesTable.$inferSelect;
export type InsertDeliveryItem = z.infer<typeof insertDeliveryItemSchema>;
export type DeliveryItem = typeof deliveryItemsTable.$inferSelect;
