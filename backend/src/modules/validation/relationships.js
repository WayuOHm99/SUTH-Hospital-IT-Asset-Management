async function findDeviceRelationshipErrors(db, data) {
  const details = [];

  async function ensureReference(field, tableName) {
    if (data[field] === undefined || data[field] === null) return;

    const [rows] = await db.query(
      `SELECT id FROM \`${tableName}\` WHERE id = ?`,
      [data[field]]
    );
    if (rows.length === 0) {
      details.push({
        field,
        message: "ไม่พบข้อมูลที่เลือก",
        code: "invalid_reference",
      });
    }
  }

  async function ensureChildRelationship({
    childField,
    childTable,
    parentField,
    parentTable,
    missingParentMessage,
    mismatchMessage,
  }) {
    const childId = data[childField];
    const parentId = data[parentField];

    if (childId === undefined || childId === null) {
      await ensureReference(parentField, parentTable);
      return;
    }

    if (parentId === undefined || parentId === null) {
      details.push({
        field: parentField,
        message: missingParentMessage,
        code: "invalid_relation",
      });
      return;
    }

    const [rows] = await db.query(
      `SELECT id FROM \`${childTable}\` WHERE id = ? AND \`${parentField}\` = ?`,
      [childId, parentId]
    );
    if (rows.length === 0) {
      details.push({
        field: childField,
        message: mismatchMessage,
        code: "invalid_relation",
      });
    }
  }

  await ensureReference("brand_id", "brand");
  await ensureReference("contract_id", "contracts");

  await ensureChildRelationship({
    childField: "floor_id",
    childTable: "floor",
    parentField: "building_id",
    parentTable: "building",
    missingParentMessage: "ต้องระบุอาคารเมื่อระบุชั้น",
    mismatchMessage: "ชั้นไม่อยู่ในอาคารที่เลือก",
  });

  await ensureChildRelationship({
    childField: "department_id",
    childTable: "department",
    parentField: "division_id",
    parentTable: "division",
    missingParentMessage: "ต้องระบุฝ่ายเมื่อระบุแผนก",
    mismatchMessage: "แผนกไม่อยู่ในฝ่ายที่เลือก",
  });

  return details;
}

module.exports = { findDeviceRelationshipErrors };
