import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { locationsTable } from "./warehouses";
import { productsTable } from "./products";
import { usersTable } from "./users";
import { docStatusEnum } from "./receipts";

export const transfersTable = pgTable("transfers", {
  id: serial("id").primaryKey(),
  referenceNo: text("reference_no").notNull().unique(),
  sourceLocationId: integer("source_location_id").notNull().references(() => locationsTable.id),
  destinationLocationId: integer("destination_location_id").notNull().references(() => locationsTable.id),
  status: docStatusEnum("status").notNull().default("draft"),
  notes: text("notes"),
  createdById: integer("created_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const transferItemsTable = pgTable("transfer_items", {
  id: serial("id").primaryKey(),
  transferId: integer("transfer_id").notNull().references(() => transfersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  quantity: integer("quantity").notNull(),
});

export const insertTransferSchema = createInsertSchema(transfersTable).omit({
  id: true,
  referenceNo: true,
  createdAt: true,
  updatedAt: true,
});
export const insertTransferItemSchema = createInsertSchema(transferItemsTable).omit({ id: true });

export type InsertTransfer = z.infer<typeof insertTransferSchema>;
export type Transfer = typeof transfersTable.$inferSelect;
export type InsertTransferItem = z.infer<typeof insertTransferItemSchema>;
export type TransferItem = typeof transferItemsTable.$inferSelect;
