const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const validateRequest = require('../middleware/validateRequest');
const {
  idParamsSchema,
  lookupSchema,
  brandSchema,
  childLookupSchema,
  fiscalYearSchema,
} = require('../modules/validation/schemas');
const { sendInternalError, sendValidationError } = require('../utils/httpError');

// ต้อง login ก่อนถึงจะเรียก master data ได้ (เดิมไม่มีการป้องกันเลย)
router.use(authMiddleware);

async function ensureParentReference(res, parentTable, parentField, parentId) {
  const [[parent]] = await db.query(
    `SELECT id FROM \`${parentTable}\` WHERE id = ?`,
    [parentId]
  );
  if (parent) return true;

  sendValidationError(res, [{
    field: parentField,
    message: 'ไม่พบข้อมูลแม่ที่เลือก',
    code: 'invalid_relation',
  }]);
  return false;
}

// ============================================================
// Master Data API — brand, building, floor, division, department, fiscal_year
// ============================================================

// Helper: สร้าง CRUD สำหรับแต่ละ lookup table
function registerLookup(tableName, routePath, bodySchema = lookupSchema) {

  // GET all
  router.get(routePath, async (req, res) => {
    try {
      const [rows] = await db.query(`SELECT * FROM \`${tableName}\` ORDER BY id`);
      res.json(rows);
    } catch (err) {
      sendInternalError(res, err, `Error fetching ${tableName}:`);
    }
  });

  // GET by id
  router.get(`${routePath}/:id`, validateRequest({ params: idParamsSchema }), async (req, res) => {
    try {
      const [rows] = await db.query(`SELECT * FROM \`${tableName}\` WHERE id = ?`, [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      sendInternalError(res, err, `Error fetching ${tableName}:`);
    }
  });

  // POST — create (admin เท่านั้น)
  router.post(routePath, adminMiddleware, validateRequest({ body: bodySchema }), async (req, res) => {
    try {
      const { name } = req.body;
      const [result] = await db.query(`INSERT INTO \`${tableName}\` (name) VALUES (?)`, [name.trim()]);
      res.status(201).json({ id: result.insertId, name: name.trim() });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: `"${req.body.name}" already exists in ${tableName}` });
      }
      sendInternalError(res, err, `Error creating ${tableName}:`);
    }
  });

  // PUT — update (admin เท่านั้น)
  router.put(`${routePath}/:id`, adminMiddleware, validateRequest({ params: idParamsSchema, body: bodySchema }), async (req, res) => {
    try {
      const { name } = req.body;
      const [result] = await db.query(`UPDATE \`${tableName}\` SET name = ? WHERE id = ?`, [name.trim(), req.params.id]);
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ id: parseInt(req.params.id), name: name.trim() });
    } catch (err) {
      sendInternalError(res, err, `Error updating ${tableName}:`);
    }
  });

  // DELETE (admin เท่านั้น)
  router.delete(`${routePath}/:id`, adminMiddleware, validateRequest({ params: idParamsSchema }), async (req, res) => {
    try {
      const [result] = await db.query(`DELETE FROM \`${tableName}\` WHERE id = ?`, [req.params.id]);
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ message: 'Deleted successfully' });
    } catch (err) {
      sendInternalError(res, err, `Error deleting ${tableName}:`);
    }
  });
}

// Helper: CRUD สำหรับ lookup table ที่มี parent (foreign key) เช่น floor -> building
function registerChildLookup(
  tableName,
  routePath,
  parentField,
  bodySchema = childLookupSchema(parentField)
) {
  const parentTable = parentField === 'building_id' ? 'building' : 'division';

  // GET all
  router.get(routePath, async (req, res) => {
    try {
      const [rows] = await db.query(`SELECT * FROM \`${tableName}\` ORDER BY id`);
      res.json(rows);
    } catch (err) {
      sendInternalError(res, err, `Error fetching ${tableName}:`);
    }
  });

  // GET by id
  router.get(`${routePath}/:id`, validateRequest({ params: idParamsSchema }), async (req, res) => {
    try {
      const [rows] = await db.query(`SELECT * FROM \`${tableName}\` WHERE id = ?`, [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      sendInternalError(res, err, `Error fetching ${tableName}:`);
    }
  });

  // POST — create (admin เท่านั้น, ต้องมีทั้งชื่อและ parent id)
  router.post(routePath, adminMiddleware, validateRequest({ body: bodySchema }), async (req, res) => {
    try {
      const { name } = req.body;
      const parentId = req.body[parentField];

      if (!await ensureParentReference(res, parentTable, parentField, parentId)) return;

      const [result] = await db.query(
        `INSERT INTO \`${tableName}\` (\`${parentField}\`, name) VALUES (?, ?)`,
        [parentId, name.trim()]
      );

      res.status(201).json({ id: result.insertId, [parentField]: parentId, name: name.trim() });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: `"${req.body.name}" already exists in ${tableName}` });
      }
      sendInternalError(res, err, `Error creating ${tableName}:`);
    }
  });

  // PUT — update (admin เท่านั้น, แก้ทั้งชื่อและ parent id)
  router.put(`${routePath}/:id`, adminMiddleware, validateRequest({ params: idParamsSchema, body: bodySchema }), async (req, res) => {
    try {
      const { name } = req.body;
      const parentId = req.body[parentField];

      if (!await ensureParentReference(res, parentTable, parentField, parentId)) return;

      const [result] = await db.query(
        `UPDATE \`${tableName}\` SET \`${parentField}\` = ?, name = ? WHERE id = ?`,
        [parentId, name.trim(), req.params.id]
      );

      if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ id: parseInt(req.params.id), [parentField]: parentId, name: name.trim() });
    } catch (err) {
      sendInternalError(res, err, `Error updating ${tableName}:`);
    }
  });

  // DELETE (admin เท่านั้น)
  router.delete(`${routePath}/:id`, adminMiddleware, validateRequest({ params: idParamsSchema }), async (req, res) => {
    try {
      const [result] = await db.query(`DELETE FROM \`${tableName}\` WHERE id = ?`, [req.params.id]);
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ message: 'Deleted successfully' });
    } catch (err) {
      sendInternalError(res, err, `Error deleting ${tableName}:`);
    }
  });
}

// Register all lookup tables
registerLookup('brand', '/brands', brandSchema);
registerLookup('building', '/buildings');
registerLookup('division', '/divisions');

// floor และ department มี foreign key ผูกกับตารางแม่ (building / division)
// ต้องใช้ registerChildLookup แทน registerLookup ธรรมดา
// (registerLookup เดิมบันทึกแค่ name ทำให้ building_id / division_id หายไปทุกครั้ง)
registerChildLookup(
  'floor',
  '/floors',
  'building_id',
  childLookupSchema('building_id', { nameMax: 50 })
);
registerChildLookup('department', '/departments', 'division_id');

// fiscal_year uses "year" column instead of "name"
const { getFiscalYearRange } = require('../utils/fiscalYear');

router.get('/fiscal-years', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM fiscal_year ORDER BY year');
    res.json(rows);
  } catch (err) {
    sendInternalError(res, err, 'Error fetching fiscal years:');
  }
});

router.post('/fiscal-years', adminMiddleware, validateRequest({ body: fiscalYearSchema }), async (req, res) => {
  try {
    const { year } = req.body;

    // คำนวณช่วงเดือน (ต.ค.-ก.ย.) ของปีงบนี้เก็บไว้เลยตอนสร้าง แทนที่จะให้แต่ละหน้าไปเดาเอาเอง
    const { startMonth, endMonth } = getFiscalYearRange(year.trim());

    const [result] = await db.query(
      'INSERT INTO fiscal_year (year, start_month, end_month) VALUES (?, ?, ?)',
      [year.trim(), startMonth, endMonth]
    );
    res.status(201).json({
      id: result.insertId,
      year: year.trim(),
      start_month: startMonth,
      end_month: endMonth,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: `Fiscal year "${req.body.year}" already exists` });
    }
    sendInternalError(res, err, 'Error creating fiscal year:');
  }
});

// เดิมหน้า admin/FiscalYear.vue เรียก PUT/DELETE อยู่แล้ว แต่ backend ไม่เคยมี route
// นี้มาก่อน ทำให้แก้ไข/ลบปีงบประมาณจากหน้า Admin ได้ 404 เสมอ
router.put('/fiscal-years/:id', adminMiddleware, validateRequest({ params: idParamsSchema, body: fiscalYearSchema }), async (req, res) => {
  try {
    const { year } = req.body;

    // แก้เลขปีงบแล้ว ช่วงเดือนต้องคำนวณใหม่ให้ตรงกันด้วย ไม่งั้นจะค้างช่วงเดือนของปีเก่าไว้
    const { startMonth, endMonth } = getFiscalYearRange(year.trim());

    const [result] = await db.query(
      'UPDATE fiscal_year SET year = ?, start_month = ?, end_month = ? WHERE id = ?',
      [year.trim(), startMonth, endMonth, req.params.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({
      id: parseInt(req.params.id),
      year: year.trim(),
      start_month: startMonth,
      end_month: endMonth,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: `Fiscal year "${req.body.year}" already exists` });
    }
    sendInternalError(res, err, 'Error updating fiscal year:');
  }
});

router.delete('/fiscal-years/:id', adminMiddleware, validateRequest({ params: idParamsSchema }), async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM fiscal_year WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    sendInternalError(res, err, 'Error deleting fiscal year:');
  }
});

module.exports = router;
