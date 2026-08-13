const db = require("../config/database");
const { z } = require("zod");
const deviceSchema = require("../modules/validation/schemas").deviceSchema;
const { findDeviceRelationshipErrors } = require("../modules/validation/relationships");
const { sendInternalError, sendValidationError } = require("../utils/httpError");

// ============================================================
// GET /api/devices
// ============================================================
exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        d.id,
        d.serial_number,
        d.model,
        d.status,
        d.price_override,
        br.name AS brand_name,
        b.name AS building_name,
        f.name AS floor_name,
        divi.name AS division_name,
        dept.name AS department_name,
        c.contract_no,
        c.price_per_page,
        fy.year AS fiscal_year
      FROM devices d
      LEFT JOIN brand br ON d.brand_id = br.id
      LEFT JOIN building b ON d.building_id = b.id
      LEFT JOIN floor f ON d.floor_id = f.id
      LEFT JOIN division divi ON d.division_id = divi.id
      LEFT JOIN department dept ON d.department_id = dept.id
      LEFT JOIN contracts c ON d.contract_id = c.id
      LEFT JOIN fiscal_year fy ON c.fiscal_year_id = fy.id
      ORDER BY d.id
    `);

    res.json(rows);
  } catch (err) {
    sendInternalError(res, err, "Error fetching devices:");
  }
};

// ============================================================
// GET /api/devices/:id
// ============================================================
exports.getOne = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT
        d.*,
        br.name AS brand_name,
        b.name AS building_name,
        f.name AS floor_name,
        divi.name AS division_name,
        dept.name AS department_name,
        c.contract_no,
        c.price_per_page,
        fy.year AS fiscal_year
      FROM devices d
      LEFT JOIN brand br ON d.brand_id = br.id
      LEFT JOIN building b ON d.building_id = b.id
      LEFT JOIN floor f ON d.floor_id = f.id
      LEFT JOIN division divi ON d.division_id = divi.id
      LEFT JOIN department dept ON d.department_id = dept.id
      LEFT JOIN contracts c ON d.contract_id = c.id
      LEFT JOIN fiscal_year fy ON c.fiscal_year_id = fy.id
      WHERE d.id = ?
    `,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: "Device not found",
      });
    }

    res.json(rows[0]);
  } catch (err) {
    sendInternalError(res, err, "Error fetching device:");
  }
};

// ============================================================
// POST /api/devices
// ============================================================
exports.create = async (req, res) => {
  try {
    const validatedData = req.validated?.body || deviceSchema.parse(req.body);

    const relationshipErrors = await findDeviceRelationshipErrors(db, validatedData);
    if (relationshipErrors.length > 0) {
      return sendValidationError(res, relationshipErrors);
    }

    const {
      serial_number,
      brand_id,
      model,
      building_id,
      floor_id,
      division_id,
      department_id,
      contract_id,
      price_override,
      status,
    } = validatedData;

    const [result] = await db.query(
      `
      INSERT INTO devices
      (
        serial_number,
        brand_id,
        model,
        building_id,
        floor_id,
        division_id,
        department_id,
        contract_id,
        price_override,
        status
      )
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `,
      [
        serial_number,
        brand_id ?? null,
        model ?? null,
        building_id ?? null,
        floor_id ?? null,
        division_id ?? null,
        department_id ?? null,
        contract_id ?? null,
        price_override ?? null,
        status ?? "active",
      ]
    );

    res.status(201).json({
      id: result.insertId,
      serial_number,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return sendValidationError(res, err.issues);
    }

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: `Serial number "${req.body.serial_number}" already exists`,
      });
    }

    sendInternalError(res, err, "Error creating device:");
  }
};

// ============================================================
// PUT /api/devices/:id
// ============================================================
exports.update = async (req, res) => {
  try {
    const validatedData = req.validated?.body || deviceSchema.parse(req.body);

    const relationshipErrors = await findDeviceRelationshipErrors(db, validatedData);
    if (relationshipErrors.length > 0) {
      return sendValidationError(res, relationshipErrors);
    }

    const {
      serial_number,
      brand_id,
      model,
      building_id,
      floor_id,
      division_id,
      department_id,
      contract_id,
      price_override,
      status,
    } = validatedData;

    const [result] = await db.query(
      `
      UPDATE devices SET
        serial_number=?,
        brand_id=?,
        model=?,
        building_id=?,
        floor_id=?,
        division_id=?,
        department_id=?,
        contract_id=?,
        price_override=?,
        status=?
      WHERE id=?
    `,
      [
        serial_number,
        brand_id ?? null,
        model ?? null,
        building_id ?? null,
        floor_id ?? null,
        division_id ?? null,
        department_id ?? null,
        contract_id ?? null,
        price_override ?? null,
        status ?? "active",
        req.params.id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Device not found",
      });
    }

    res.json({
      message: "Device updated successfully",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return sendValidationError(res, err.issues);
    }

    sendInternalError(res, err, "Error updating device:");
  }
};

// ============================================================
// DELETE /api/devices/:id
// ============================================================
exports.remove = async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM devices WHERE id=?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Device not found",
      });
    }

    res.json({
      message: "Device deleted successfully",
    });
  } catch (err) {
    sendInternalError(res, err, "Error deleting device:");
  }
};
