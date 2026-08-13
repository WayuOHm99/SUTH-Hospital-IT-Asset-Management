const express = require("express");

const db = require("../config/database");
const authMiddleware = require("../middleware/authMiddleware");
const createDashboardController = require("../modules/dashboard/dashboardController");
const validateRequest = require("../middleware/validateRequest");
const {
  dashboardQuerySchema,
  dashboardSingleMonthQuerySchema,
} = require("../modules/validation/schemas");

const router = express.Router();
const dashboard = createDashboardController(db);

router.use(authMiddleware);
router.get("/monthly-kpi", validateRequest({ query: dashboardQuerySchema }), dashboard.monthlyKpi);
router.get("/summary-by-building", validateRequest({ query: dashboardQuerySchema }), dashboard.summaryByBuilding);
router.get("/compare", validateRequest({ query: dashboardQuerySchema }), dashboard.compare);
router.get("/stats", validateRequest({ query: dashboardQuerySchema }), dashboard.stats);
router.get("/expense", validateRequest({ query: dashboardSingleMonthQuerySchema }), dashboard.expense);
router.get("/by-department", validateRequest({ query: dashboardSingleMonthQuerySchema }), dashboard.byDepartment);
router.get("/highlights", validateRequest({ query: dashboardQuerySchema }), dashboard.highlights);

module.exports = router;
