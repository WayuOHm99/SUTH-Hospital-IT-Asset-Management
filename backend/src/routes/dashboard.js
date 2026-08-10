const express = require("express");

const db = require("../config/database");
const authMiddleware = require("../middleware/authMiddleware");
const createDashboardController = require("../modules/dashboard/dashboardController");

const router = express.Router();
const dashboard = createDashboardController(db);

router.use(authMiddleware);
router.get("/monthly-kpi", dashboard.monthlyKpi);
router.get("/summary-by-building", dashboard.summaryByBuilding);
router.get("/compare", dashboard.compare);
router.get("/stats", dashboard.stats);
router.get("/expense", dashboard.expense);
router.get("/by-department", dashboard.byDepartment);
router.get("/highlights", dashboard.highlights);

module.exports = router;
