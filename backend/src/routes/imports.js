const express = require("express");
const fs = require("fs");
const multer = require("multer");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const importController = require("../controllers/importController");
const {
  MAX_IMPORT_FILE_SIZE,
  IMPORT_ALLOWED_MIME_TYPES,
  IMPORT_ALLOWED_EXTENSIONS,
  importFileSchema,
} = require("../modules/validation/schemas");
const { sendValidationError } = require("../utils/httpError");

// จำกัดขนาดไฟล์ (5MB) และรับเฉพาะไฟล์ Excel/CSV กัน disk เต็ม/อัปโหลดไฟล์แปลกปลอม
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: MAX_IMPORT_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname
      .slice(file.originalname.lastIndexOf("."))
      .toLowerCase();

    const isAllowed =
      IMPORT_ALLOWED_MIME_TYPES.includes(file.mimetype) ||
      IMPORT_ALLOWED_EXTENSIONS.includes(ext);

    if (!isAllowed) {
      return cb(new Error("unsupported import file"));
    }

    cb(null, true);
  },
});

// ดัก error จาก multer (ไฟล์ใหญ่เกิน/นามสกุลไม่ตรง) ให้ตอบกลับเป็น JSON ที่อ่านง่าย
// แทนที่จะปล่อยให้หลุดไป error handler กลาง ๆ
function handleUpload(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error("Upload middleware error:", err);
      if (err.code === "LIMIT_FILE_SIZE") {
        return sendValidationError(res, [{
          field: "file",
          message: "ไฟล์มีขนาดใหญ่เกินขนาดที่กำหนด",
          code: err.code,
        }]);
      }
      return sendValidationError(res, [{
        field: "file",
        message: "ไฟล์อัปโหลดไม่ถูกต้อง",
        code: "invalid_upload",
      }]);
    }
    if (err) {
      console.error("Upload file filter error:", err);
      return sendValidationError(res, [{
        field: "file",
        message: "ไฟล์ไม่ผ่านการตรวจสอบ",
        code: "invalid_file",
      }]);
    }
    next();
  });
}

function removeUploadedFile(file) {
  if (!file?.path || !fs.existsSync(file.path)) return;

  try {
    fs.unlinkSync(file.path);
  } catch (error) {
    console.error("Unable to remove rejected upload:", error);
  }
}

function validateImportFile(req, res, next) {
  if (!req.file) {
    return sendValidationError(res, [{
      field: "file",
      message: "กรุณาอัปโหลดไฟล์ Excel หรือ CSV",
      code: "required",
    }]);
  }

  const result = importFileSchema.safeParse(req.file);
  if (!result.success) {
    console.error("Import file validation failed:", result.error);
    removeUploadedFile(req.file);
    return sendValidationError(res, result.error.issues);
  }

  req.file = result.data;
  return next();
}


// ต้อง login และเป็น admin ถึงจะ import ได้ (เดิมไม่มีการป้องกันเลย)
router.post(
  "/devices/import",
  authMiddleware,
  adminMiddleware,
  handleUpload,
  validateImportFile,
  importController.importDevices
);

// นำเข้ายอดพิมพ์รายเดือน (มิเตอร์) จากไฟล์ Excel เดิม — จับคู่ด้วย SN. แล้วแปลง
// หัวคอลัมน์ "meter M/YY" เป็นเดือนปฏิทินจริงก่อนบันทึก (ดูเหตุผลใน importController.js)
router.post(
  "/print-transactions/import",
  authMiddleware,
  adminMiddleware,
  handleUpload,
  validateImportFile,
  importController.importPrintTransactions
);


module.exports = router;
