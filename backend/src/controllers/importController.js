const fs = require("fs");
const XLSX = require("xlsx");
const db = require("../config/database");
const {
  MAX_DATABASE_INT,
  MAX_IMPORT_ROWS,
} = require("../modules/validation/schemas");
const { sendInternalError, sendValidationError } = require("../utils/httpError");

class InvalidWorkbookError extends Error {
  constructor(cause) {
    super("Invalid import workbook", { cause });
    this.name = "InvalidWorkbookError";
  }
}

function readFirstWorksheet(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const sheet = firstSheetName && workbook.Sheets[firstSheetName];
    if (!sheet) throw new Error("Workbook has no worksheet");
    return sheet;
  } catch (error) {
    throw new InvalidWorkbookError(error);
  }
}

function removeImportFile(file) {
  if (!file?.path || !fs.existsSync(file.path)) return;

  try {
    fs.unlinkSync(file.path);
  } catch (error) {
    console.error("Unable to remove import upload:", error);
  }
}

function sendImportError(req, res, error, context) {
  removeImportFile(req.file);

  if (error instanceof InvalidWorkbookError) {
    console.error("Invalid import workbook:", error.cause);
    return sendValidationError(res, [{
      field: "file",
      message: "ไม่สามารถอ่านไฟล์ Excel หรือ CSV นี้ได้",
      code: "invalid_workbook",
    }]);
  }

  return sendInternalError(res, error, context);
}

// ============================================================
// แปลง "เดือน/ปี พ.ศ. 2 หลัก" ในหัวคอลัมน์ไฟล์มิเตอร์ (เช่น "meter 9/67",
// "meter10/67", "meter 1/68") ให้เป็น "YYYY-MM" (ค.ศ.) ที่ตรงกับเดือนจริง
//
// ⚠️ ห้ามใช้ "ลำดับคอลัมน์" (column position) มาเดาว่าเป็นเดือนไหนของปีงบ
// เพราะไฟล์ Excel เดิมเรียงคอลัมน์เดือนเริ่มจาก "กันยายน" (เดือนก่อนปีงบใหม่)
// ไม่ได้เริ่มจาก "ตุลาคม" แบบปีงบราชการไทยที่ระบบใช้ (ดู src/utils/fiscalYear.js)
// ถ้า map ตามตำแหน่งคอลัมน์ตรงๆ ยอดของเดือนกันยาจะไปตกที่เดือนตุลาแทน (เพี้ยนทั้งแถว)
// จึงต้อง "อ่านชื่อเดือน/ปีจากหัวคอลัมน์" ทุกครั้ง แล้วคำนวณเป็นเดือนปฏิทินจริงเสมอ
// เมื่อเดือนจริงถูกต้องแล้ว การ query ด้วยช่วงปีงบ (start_month/end_month) ฝั่ง
// print-transactions.js ก็จะแบ่งเดือนเข้าปีงบที่ถูกต้องเองโดยอัตโนมัติ
function parseMeterMonthHeader(header) {
  const match = String(header || "").match(/meter\s*(\d{1,2})\s*\/\s*(\d{2})/i);
  if (!match) return null;

  const month = Number(match[1]);
  if (month < 1 || month > 12) return null;

  // ปี พ.ศ. ในไฟล์เก็บแค่ 2 หลัก (เช่น "67" = 2567) — เดาศตวรรษ 2500 เอา
  // เพราะไฟล์นี้เป็นข้อมูลปีงบปัจจุบัน ไม่มีทางเป็นปี 2400 หรือ 2600
  const beYearFull = 2500 + Number(match[2]);
  const ceYear = beYearFull - 543;

  return `${ceYear}-${String(month).padStart(2, "0")}`;
}

exports.importDevices = async (req, res) => {

  try {

    // อ่าน Excel
    const sheet = readFirstWorksheet(req.file.path);

    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: ""
    });

    if (rows.length > MAX_IMPORT_ROWS) {
      removeImportFile(req.file);
      return sendValidationError(res, [{
        field: "file",
        message: `ไฟล์มีข้อมูลเกิน ${MAX_IMPORT_ROWS.toLocaleString()} แถว`,
        code: "too_many_rows",
      }]);
    }


    // โหลด Master Data
    const [brandRows] = await db.query(
      "SELECT id, name FROM brand"
    );

    const [buildingRows] = await db.query(
      "SELECT id, name FROM building"
    );

    const [existingDevices] = await db.query(
      "SELECT serial_number FROM devices"
    );


    const brandMap = {};
    const buildingMap = {};


    brandRows.forEach((brandRow) => {
      brandMap[String(brandRow.name).trim()] = brandRow.id;
    });


    buildingRows.forEach((buildingRow) => {
      buildingMap[String(buildingRow.name).trim()] = buildingRow.id;
    });



    const insertData = [];
    const skipped = []; // แถวที่ import ไม่ได้ พร้อมเหตุผล ให้ frontend แสดงให้ผู้ใช้แก้ไขได้
    const seenSerialNumbers = new Set(
      existingDevices.map((device) => String(device.serial_number).trim().toUpperCase())
    );


    for (const row of rows) {


      const serialNumber = String(
        row.serial_number ||
        row.Serial_Number ||
        row["Serial Number"] ||
        row.SN ||
        row.sn ||
        ""
      ).trim();


      const brandName = String(
        row.brand ||
        row.Brand ||
        row.ยี่ห้อ ||
        ""
      ).trim();


      const model = String(
        row.model ||
        row.Model ||
        row.รุ่น ||
        ""
      ).trim();


      const buildingName = String(
        row.building ||
        row.Building ||
        row.อาคาร ||
        ""
      ).trim();



      const brandId = brandMap[brandName];

      const buildingId = buildingMap[buildingName];

      if (!serialNumber) {
        skipped.push({
          serial_number: "(ไม่มีเลขซีเรียล)",
          brand: brandName,
          building: buildingName,
          reason: "ต้องระบุเลขซีเรียล",
        });
        continue;
      }

      if (serialNumber.length > 100) {
        skipped.push({
          serial_number: serialNumber,
          brand: brandName,
          building: buildingName,
          reason: "เลขซีเรียลยาวเกิน 100 ตัวอักษร",
        });
        continue;
      }

      if (model.length > 100) {
        skipped.push({
          serial_number: serialNumber,
          brand: brandName,
          building: buildingName,
          reason: "ชื่อรุ่นยาวเกิน 100 ตัวอักษร",
        });
        continue;
      }

      const normalizedSerialNumber = serialNumber.toUpperCase();
      if (seenSerialNumbers.has(normalizedSerialNumber)) {
        skipped.push({
          serial_number: serialNumber,
          brand: brandName,
          building: buildingName,
          reason: "เลขซีเรียลซ้ำกับข้อมูลในระบบหรือแถวก่อนหน้า",
        });
        continue;
      }



      if (!brandId || !buildingId) {

        const reasons = [];
        if (!brandId) reasons.push(`ไม่พบยี่ห้อ "${brandName || "(ว่าง)"}" ในระบบ`);
        if (!buildingId) reasons.push(`ไม่พบอาคาร "${buildingName || "(ว่าง)"}" ในระบบ`);

        skipped.push({
          serial_number: serialNumber || "(ไม่มีเลขซีเรียล)",
          brand: brandName,
          building: buildingName,
          reason: reasons.join(", "),
        });

        continue;
      }



      insertData.push([
        serialNumber,
        brandId,
        model,
        buildingId
      ]);
      seenSerialNumbers.add(normalizedSerialNumber);

    }



    // Insert Database
    if (insertData.length > 0) {

      await db.query(
        `
        INSERT INTO devices
        (
          serial_number,
          brand_id,
          model,
          building_id
        )
        VALUES ?
        `,
        [insertData]
      );

    }



    // ลบไฟล์ชั่วคราว
    removeImportFile(req.file);



    res.json({

      message: "Import สำเร็จ",

      total_rows: rows.length,

      inserted: insertData.length,

      skipped

    });



  } catch (err) {


    return sendImportError(req, res, err, "IMPORT ERROR:");

  }

};


// ============================================================
// นำเข้ายอดพิมพ์รายเดือน (มิเตอร์) จากไฟล์ Excel ต้นฉบับ (ชีทแบบ "ไฟล์โปรเจคสยอง")
// เข้าตาราง print_transactions โดยจับคู่เครื่องด้วยเลข SN.
//
// หัวตารางในไฟล์จริงอยู่ "แถวที่ 2" (แถวที่ 1 เป็นแค่หัวข้อรวม/merge cell)
// จึงอ่านเป็น array ของแถวดิบก่อน (header: 1) แล้วค่อยหาแถวหัวตารางเองจาก
// เซลล์ที่ขึ้นต้นด้วย "SN" แทนที่จะ hardcode เลขแถว เผื่อไฟล์ในอนาคตขยับแถว
// ============================================================
exports.importPrintTransactions = async (req, res) => {

  try {

    const sheet = readFirstWorksheet(req.file.path);

    const raw = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: true,
    });

    if (raw.length > MAX_IMPORT_ROWS + 1) {
      removeImportFile(req.file);
      return sendValidationError(res, [{
        field: "file",
        message: `ไฟล์มีข้อมูลเกิน ${MAX_IMPORT_ROWS.toLocaleString()} แถว`,
        code: "too_many_rows",
      }]);
    }

    // หาแถวหัวตาราง: แถวแรกที่มีเซลล์ขึ้นต้นด้วย "SN" (ไม่สนตัวพิมพ์เล็ก/ใหญ่ หรือมีจุดต่อท้าย)
    const headerRowIndex = raw.findIndex((row) =>
      row.some((cell) => /^sn\.?$/i.test(String(cell || "").trim()))
    );

    if (headerRowIndex === -1) {
      removeImportFile(req.file);
      return sendValidationError(res, [{
        field: "file",
        message: "ไม่พบแถวหัวตาราง (หาคอลัมน์ SN. ไม่เจอ) — ไฟล์นี้อาจไม่ใช่รูปแบบที่รองรับ",
        code: "missing_header",
      }]);
    }

    const headerRow = raw[headerRowIndex];

    const serialNumberColumnIndex = headerRow.findIndex((cell) =>
      /^sn\.?$/i.test(String(cell || "").trim())
    );

    // เก็บ "index คอลัมน์ -> เดือนจริง (YYYY-MM)" เฉพาะคอลัมน์ meter M/YY เท่านั้น
    // (ไม่ยุ่งกับคอลัมน์ "พิมพ์ประจำเดือน"/"พิมพ์สะสม" ที่ซ้ำ/เป็นยอดคำนวณ ไม่ใช่ค่าดิบ)
    const meterColumns = [];
    headerRow.forEach((cell, columnIndex) => {
      const month = parseMeterMonthHeader(cell);
      if (month) meterColumns.push({ columnIndex, month });
    });

    if (!meterColumns.length) {
      removeImportFile(req.file);
      return sendValidationError(res, [{
        field: "file",
        message: "ไม่พบคอลัมน์มิเตอร์รายเดือน (เช่น \"meter 9/67\") ในไฟล์นี้",
        code: "missing_meter_columns",
      }]);
    }

    // โหลดเครื่องทั้งหมดมา map SN -> device_id (trim กันช่องว่างเกินจากไฟล์ Excel)
    const [devices] = await db.query("SELECT id, serial_number FROM devices");
    const deviceMap = {};
    devices.forEach((device) => {
      deviceMap[String(device.serial_number).trim().toUpperCase()] = device.id;
    });

    const upserts = []; // [device_id, month, pages]
    const skipped = [];

    for (let rowIndex = headerRowIndex + 1; rowIndex < raw.length; rowIndex++) {
      const row = raw[rowIndex];
      if (!row || !row.length) continue;

      const serialNumber = String(row[serialNumberColumnIndex] || "").trim();
      if (!serialNumber) {
        skipped.push({ serial_number: "(ไม่มีเลขซีเรียล)", reason: "ต้องระบุเลขซีเรียล" });
        continue;
      }

      const deviceId = deviceMap[serialNumber.toUpperCase()];
      if (!deviceId) {
        skipped.push({ serial_number: serialNumber, reason: `ไม่พบเครื่อง SN "${serialNumber}" ในระบบ` });
        continue;
      }

      for (const { columnIndex, month } of meterColumns) {
        const cellValue = row[columnIndex];

        // ข้ามเซลล์ว่าง/ไม่ใช่ตัวเลข (เดือนที่เครื่องยังไม่ติดตั้ง หรือยังไม่มีการอ่านมิเตอร์)
        if (cellValue === "" || cellValue === null || cellValue === undefined) continue;

        const pages = Number(cellValue);
        if (Number.isNaN(pages)) {
          skipped.push({
            serial_number: serialNumber,
            month,
            reason: "จำนวนหน้าต้องเป็นตัวเลข",
          });
          continue;
        }
        if (!Number.isInteger(pages) || pages < 0 || pages > MAX_DATABASE_INT) {
          skipped.push({
            serial_number: serialNumber,
            month,
            reason: `จำนวนหน้าต้องเป็นจำนวนเต็มที่ไม่ติดลบและไม่เกิน ${MAX_DATABASE_INT.toLocaleString()}`,
          });
          continue;
        }

        upserts.push([deviceId, month, pages]);
      }
    }

    if (upserts.length > 0) {
      await db.query(
        `
        INSERT INTO print_transactions (device_id, month, pages)
        VALUES ?
        ON DUPLICATE KEY UPDATE pages = VALUES(pages)
        `,
        [upserts]
      );
    }

    removeImportFile(req.file);

    res.json({
      message: "Import ยอดพิมพ์รายเดือนสำเร็จ",
      months_found: [...new Set(meterColumns.map((m) => m.month))].sort(),
      rows_upserted: upserts.length,
      skipped,
    });

  } catch (err) {

    return sendImportError(req, res, err, "IMPORT PRINT TRANSACTIONS ERROR:");

  }

};
