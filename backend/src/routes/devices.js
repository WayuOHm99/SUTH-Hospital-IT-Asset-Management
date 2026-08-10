const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const deviceController = require("../controllers/deviceController");

// ทุกคนที่ Login แล้วดูได้
router.get(
  "/",
  authMiddleware,
  deviceController.getAll
);

router.get(
  "/:id",
  authMiddleware,
  deviceController.getOne
);

// Admin เท่านั้น
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  deviceController.create
);

router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  deviceController.update
);

router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  deviceController.remove
);

module.exports = router;
