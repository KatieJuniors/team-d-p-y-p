import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import categoriesRouter from "./categories.js";
import warehousesRouter from "./warehouses.js";
import locationsRouter from "./locations.js";
import productsRouter from "./products.js";
import receiptsRouter from "./receipts.js";
import deliveriesRouter from "./deliveries.js";
import transfersRouter from "./transfers.js";
import adjustmentsRouter from "./adjustments.js";
import ledgerRouter from "./ledger.js";
import dashboardRouter from "./dashboard.js";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/categories", categoriesRouter);
router.use("/warehouses", warehousesRouter);
router.use("/locations", locationsRouter);
router.use("/products", productsRouter);
router.use("/receipts", receiptsRouter);
router.use("/deliveries", deliveriesRouter);
router.use("/transfers", transfersRouter);
router.use("/adjustments", adjustmentsRouter);
router.use("/ledger", ledgerRouter);
router.use("/dashboard", dashboardRouter);

export default router;
