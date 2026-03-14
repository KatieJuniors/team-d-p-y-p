import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";
import { usersTable } from "./users";

export const operationTypeEnum = pgEnum("operation_type", ["receipt", "delivery", "transfer", "adjustment"]);

export const stockLedgerTable = pgTable("stock_ledger", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  operationType: operationTypeEnum("operation_type").notNull(),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  quantity: integer("quantity").notNull(),
  sourceLocation: text("source_location"),
  destinationLocation: text("destination_location"),
  referenceDoc: text("reference_doc").notNull(),
  userId: integer("user_id").references(() => usersTable.id),
});

export const insertLedgerSchema = createInsertSchema(stockLedgerTable).omit({
  id: true,
  timestamp: true,
});
export type InsertLedger = z.infer<typeof insertLedgerSchema>;
export type StockLedger = typeof stockLedgerTable.$inferSelect;
