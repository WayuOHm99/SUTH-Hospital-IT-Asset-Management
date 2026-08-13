const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  deviceSchema,
  idParamsSchema,
} = require("../modules/validation/schemas");

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
  validateRequest({ params: idParamsSchema }),
  deviceController.getOne
);

// Admin เท่านั้น
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  validateRequest({ body: deviceSchema }),
  deviceController.create
);

router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  validateRequest({ params: idParamsSchema, body: deviceSchema }),
  deviceController.update
);

router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  validateRequest({ params: idParamsSchema }),
  deviceController.remove
);

module.exports = router;
