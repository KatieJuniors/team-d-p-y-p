import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { warehousesTable } from "./warehouses";
import { productsTable } from "./products";
import { usersTable } from "./users";

export const docStatusEnum = pgEnum("doc_status", ["draft", "waiting", "ready", "done", "canceled"]);

export const receiptsTable = pgTable("receipts", {
  id: serial("id").primaryKey(),
  referenceNo: text("reference_no").notNull().unique(),
  supplier: text("supplier").notNull(),
  warehouseId: integer("warehouse_id").references(() => warehousesTable.id),
  status: docStatusEnum("status").notNull().default("draft"),
  notes: text("notes"),
  createdById: integer("created_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const receiptItemsTable = pgTable("receipt_items", {
  id: serial("id").primaryKey(),
  receiptId: integer("receipt_id").notNull().references(() => receiptsTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  quantity: integer("quantity").notNull(),
});

export const insertReceiptSchema = createInsertSchema(receiptsTable).omit({
  id: true,
  referenceNo: true,
  createdAt: true,
  updatedAt: true,
});
export const insertReceiptItemSchema = createInsertSchema(receiptItemsTable).omit({ id: true });

export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receiptsTable.$inferSelect;
export type InsertReceiptItem = z.infer<typeof insertReceiptItemSchema>;
export type ReceiptItem = typeof receiptItemsTable.$inferSelect;
