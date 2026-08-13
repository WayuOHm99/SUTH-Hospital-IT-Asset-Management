const { z } = require("zod");

const {
  MIN_FISCAL_YEAR_BE,
  MAX_FISCAL_YEAR_BE,
} = require("../../utils/fiscalYear");

const MAX_BULK_ITEMS = 1000;
const MAX_BULK_DEVICE_ITEMS = 12;
const MAX_IMPORT_ROWS = 5000;
const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024;
const MAX_DATABASE_INT = 2147483647;
const IMPORT_ALLOWED_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
];
const IMPORT_ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

function normalizeMonth(value) {
  if (typeof value !== "string") return null;

  const match = value.trim().match(/^(\d{4})-(\d{1,2})$/);
  if (!match) return null;

  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  return `${match[1]}-${String(month).padStart(2, "0")}`;
}

function blankToUndefined(value) {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}

function optionalTrimmedText({ max = 255, nullable = false } = {}) {
  let schema = z.string().trim().max(max);
  if (nullable) schema = schema.nullable();
  return z.preprocess(blankToUndefined, schema.optional());
}

function requiredText({ max = 255 } = {}) {
  return z.string().trim().min(1).max(max);
}

const numericValue = z.preprocess(
  (value) => {
    if (typeof value === "string" && /^[+-]?(?:\d+|\d*\.\d+)$/.test(value.trim())) {
      return Number(value.trim());
    }
    return value;
  },
  z.number().finite("ต้องเป็นตัวเลขที่ถูกต้อง")
);

function integerId({ nullable = false, optional = true } = {}) {
  let schema = numericValue
    .refine(Number.isInteger, "ต้องเป็นจำนวนเต็ม")
    .refine((value) => value > 0, "ต้องเป็นค่ามากกว่าศูนย์")
    .refine((value) => value <= MAX_DATABASE_INT, `ต้องไม่เกิน ${MAX_DATABASE_INT}`);
  if (nullable) schema = schema.nullable();
  if (optional) schema = schema.optional();
  return z.preprocess(
    (value) => (value === null && !nullable ? undefined : blankToUndefined(value)),
    schema
  );
}

function hasAtMostDecimalPlaces(value, decimalPlaces) {
  const factor = 10 ** decimalPlaces;
  const scaled = value * factor;
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(scaled)) * 4;
  return Math.abs(scaled - Math.round(scaled)) <= tolerance;
}

function nonNegativeNumber({
  integer = false,
  nullable = false,
  optional = true,
  max,
  decimalPlaces,
} = {}) {
  let schema = numericValue.refine((value) => value >= 0, "ต้องไม่ติดลบ");
  if (integer) schema = schema.refine(Number.isInteger, "ต้องเป็นจำนวนเต็ม");
  if (max !== undefined) {
    schema = schema.refine((value) => value <= max, `ต้องไม่เกิน ${max}`);
  }
  if (decimalPlaces !== undefined) {
    schema = schema.refine(
      (value) => hasAtMostDecimalPlaces(value, decimalPlaces),
      `ต้องมีทศนิยมไม่เกิน ${decimalPlaces} ตำแหน่ง`
    );
  }
  if (nullable) schema = schema.nullable();
  if (optional) schema = schema.optional();
  return z.preprocess(
    (value) => (value === null && !nullable ? undefined : blankToUndefined(value)),
    schema
  );
}

const monthSchema = z.preprocess(
  (value) => normalizeMonth(value) || value,
  z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "ต้องเป็นเดือนรูปแบบ YYYY-MM")
);

const monthListSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value !== "string") return value;

    const parts = value.split(",").map((month) => month.trim());
    if (parts.some((month) => month === "")) return value;

    const months = parts.map((month) => normalizeMonth(month));
    if (months.some((month) => month === null)) {
      return value;
    }

    return [...new Set(months)].join(",");
  },
  z
    .string()
    .refine(
      (value) => value.split(",").every((month) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month)),
      "ต้องเป็นเดือนรูปแบบ YYYY-MM คั่นด้วย comma"
    )
    .optional()
);

const deviceSchema = z.object({
  serial_number: requiredText({ max: 100 }),
  brand_id: integerId({ nullable: true }),
  model: optionalTrimmedText({ max: 100, nullable: true }),
  building_id: integerId({ nullable: true }),
  floor_id: integerId({ nullable: true }),
  division_id: integerId({ nullable: true }),
  department_id: integerId({ nullable: true }),
  contract_id: integerId({ nullable: true }),
  price_override: nonNegativeNumber({
    nullable: true,
    max: 99999999.99,
    decimalPlaces: 2,
  }),
  status: z.preprocess(
    blankToUndefined,
    z.enum(["active", "repair", "retired"]).optional()
  ),
});

const loginSchema = z.object({
  username: requiredText({ max: 50 }),
  password: z
    .string()
    .refine((value) => value.trim().length > 0, "ต้องระบุรหัสผ่าน"),
});

const contractSchema = z.object({
  contract_no: requiredText({ max: 100 }),
  fiscal_year_id: integerId({ nullable: true }),
  price_per_page: nonNegativeNumber({
    nullable: true,
    max: 99999999.99,
    decimalPlaces: 2,
  }),
});

const lookupSchema = z.object({
  name: requiredText(),
});

const brandSchema = z.object({
  name: requiredText({ max: 100 }),
});

const childLookupSchema = (parentField, { nameMax = 255 } = {}) =>
  lookupSchema.extend({
    name: requiredText({ max: nameMax }),
    [parentField]: integerId({ nullable: false, optional: false }),
  });

const fiscalYearSchema = z.object({
  year: z
    .preprocess(
      blankToUndefined,
      numericValue
        .refine(Number.isInteger, "ต้องเป็นจำนวนเต็ม")
        .refine(
          (value) => value >= MIN_FISCAL_YEAR_BE && value <= MAX_FISCAL_YEAR_BE,
          "ปีงบประมาณต้องเป็น พ.ศ. 4 หลักที่แปลงเป็นช่วง YYYY-MM ได้"
        )
    )
    .transform((year) => String(year)),
});

const idParamsSchema = z.object({
  id: integerId({ nullable: false, optional: false }),
});

const deviceIdParamsSchema = z.object({
  deviceId: integerId({ nullable: false, optional: false }),
});

const monthQuerySchema = z.object({
  month: monthListSchema,
});

const singleMonthQuerySchema = z.object({
  month: z.preprocess(
    (value) => (value === undefined || value === null || value === "" ? undefined : normalizeMonth(value) || value),
    monthSchema.optional()
  ),
});

const dashboardQuerySchema = z.object({
  month: monthListSchema,
  building_name: optionalTrimmedText(),
  fiscal_year_id: integerId(),
});

const dashboardSingleMonthQuerySchema = z.object({
  month: z.preprocess(
    (value) => (value === undefined || value === null || value === "" ? undefined : normalizeMonth(value) || value),
    monthSchema.optional()
  ),
  building_name: optionalTrimmedText(),
  fiscal_year_id: integerId(),
});

const printTransactionQuerySchema = singleMonthQuerySchema;

const printTransactionSchema = z.object({
  device_id: integerId({ nullable: false, optional: false }),
  month: monthSchema,
  pages: nonNegativeNumber({
    integer: true,
    nullable: false,
    optional: false,
    max: MAX_DATABASE_INT,
  }),
});

const bulkPrintItemSchema = z.object({
  device_id: integerId({ nullable: false, optional: false }),
  pages: nonNegativeNumber({
    integer: true,
    nullable: true,
    max: MAX_DATABASE_INT,
  }),
});

const bulkPrintTransactionsSchema = z.object({
  month: monthSchema,
  items: z.array(bulkPrintItemSchema).min(1).max(MAX_BULK_ITEMS),
});

const bulkDeviceItemSchema = z.object({
  month: monthSchema,
  pages: nonNegativeNumber({
    integer: true,
    nullable: true,
    max: MAX_DATABASE_INT,
  }),
});

const bulkDeviceSchema = z.object({
  device_id: integerId({ nullable: false, optional: false }),
  items: z.array(bulkDeviceItemSchema).min(1).max(MAX_BULK_DEVICE_ITEMS),
});

const printSummaryQuerySchema = z.object({
  fiscal_year_id: integerId({ nullable: false, optional: false }),
});

const printByDeviceQuerySchema = printSummaryQuerySchema;

const expenseParamsSchema = z.object({
  fiscal_year_id: integerId({ nullable: false, optional: false }),
});

const roleSchema = z.enum(["admin", "staff", "viewer"]);

const paginationSchema = z.object({
  page: z.preprocess(
    blankToUndefined,
    numericValue
      .refine(Number.isInteger, "ต้องเป็นจำนวนเต็ม")
      .refine((value) => value >= 1, "หน้าต้องเริ่มที่ 1")
      .default(1)
  ),
  limit: z.preprocess(
    blankToUndefined,
    numericValue
      .refine(Number.isInteger, "ต้องเป็นจำนวนเต็ม")
      .refine((value) => value >= 1 && value <= 100, "จำนวนรายการต่อหน้าต้องอยู่ระหว่าง 1 ถึง 100")
      .default(50)
  ),
});

const importFileSchema = z
  .object({
    originalname: z.string().trim().min(1).max(255),
    mimetype: z.string().trim().min(1).max(128),
    path: z.string().min(1).max(4096),
    size: z.number().int().nonnegative().max(MAX_IMPORT_FILE_SIZE),
  })
  .superRefine((file, context) => {
    const extension = file.originalname.slice(file.originalname.lastIndexOf(".")).toLowerCase();
    const hasSupportedExtension = IMPORT_ALLOWED_EXTENSIONS.includes(extension);
    const hasSupportedMimeType = IMPORT_ALLOWED_MIME_TYPES.includes(file.mimetype);

    // Keep the existing browser compatibility rule: a supported extension or
    // MIME type is enough, while the shared schema remains the final check.
    if (!hasSupportedExtension && !hasSupportedMimeType) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["originalname"],
        message: "รองรับเฉพาะไฟล์ XLSX, XLS หรือ CSV",
      });
    }
  });

module.exports = {
  MAX_BULK_ITEMS,
  MAX_BULK_DEVICE_ITEMS,
  MAX_IMPORT_ROWS,
  MAX_IMPORT_FILE_SIZE,
  MAX_DATABASE_INT,
  IMPORT_ALLOWED_MIME_TYPES,
  IMPORT_ALLOWED_EXTENSIONS,
  normalizeMonth,
  deviceSchema,
  loginSchema,
  contractSchema,
  lookupSchema,
  brandSchema,
  childLookupSchema,
  fiscalYearSchema,
  idParamsSchema,
  deviceIdParamsSchema,
  monthQuerySchema,
  singleMonthQuerySchema,
  dashboardQuerySchema,
  dashboardSingleMonthQuerySchema,
  printTransactionQuerySchema,
  printTransactionSchema,
  bulkPrintTransactionsSchema,
  bulkDeviceSchema,
  printSummaryQuerySchema,
  printByDeviceQuerySchema,
  expenseParamsSchema,
  roleSchema,
  paginationSchema,
  importFileSchema,
};
