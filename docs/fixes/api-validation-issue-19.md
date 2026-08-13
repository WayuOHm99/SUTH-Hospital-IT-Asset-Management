# Issue #19 validation compatibility notes

## Request validation contract

All changed API routes validate and normalize the request source they consume
before database work. Invalid input returns HTTP 400 with this stable shape:

```json
{
  "error": "Validation failed",
  "message": "Request validation failed",
  "details": [
    {
      "field": "month",
      "source": "body",
      "message": "ต้องเป็นเดือนรูปแบบ YYYY-MM",
      "code": "invalid_format"
    }
  ]
}
```

Parser errors such as malformed JSON and oversized JSON bodies use the same
shape. Unexpected server and database failures return only a generic 500
message; their details remain in server logs.

Numeric IDs and printer page counts are bounded to the signed MySQL `INT`
range. Device, contract, login, and master-data text/decimal values are bounded
to their current database columns so client errors do not surface as SQL 500s.
Thai fiscal years must produce a valid October-to-September `YYYY-MM` range.

## API input inventory

Brace notation expands to every listed route. `-` means that the handler does
not consume caller-supplied input from that source.

| Method and route | Params | Query | Body or file |
| --- | --- | --- | --- |
| `POST /api/auth/login` | - | - | `username`, `password` |
| `GET /api/{brands,buildings,divisions,floors,departments}` | - | - | - |
| `GET /api/{brands,buildings,divisions,floors,departments}/:id` | positive integer `id` | - | - |
| `POST /api/{brands,buildings,divisions}` | - | - | `name` |
| `PUT /api/{brands,buildings,divisions}/:id` | positive integer `id` | - | `name` |
| `DELETE /api/{brands,buildings,divisions}/:id` | positive integer `id` | - | - |
| `POST /api/floors` | - | - | `name`, positive integer `building_id` |
| `PUT /api/floors/:id` | positive integer `id` | - | `name`, positive integer `building_id` |
| `DELETE /api/floors/:id` | positive integer `id` | - | - |
| `POST /api/departments` | - | - | `name`, positive integer `division_id` |
| `PUT /api/departments/:id` | positive integer `id` | - | `name`, positive integer `division_id` |
| `DELETE /api/departments/:id` | positive integer `id` | - | - |
| `GET /api/fiscal-years` | - | - | - |
| `POST /api/fiscal-years` | - | - | four-digit Buddhist Era `year` |
| `PUT /api/fiscal-years/:id` | positive integer `id` | - | four-digit Buddhist Era `year` |
| `DELETE /api/fiscal-years/:id` | positive integer `id` | - | - |
| `GET /api/devices` | - | - | - |
| `GET /api/devices/:id` | positive integer `id` | - | - |
| `POST /api/devices` | - | - | `serial_number`; optional `brand_id`, `model`, `building_id`, `floor_id`, `division_id`, `department_id`, `contract_id`, `price_override`, `status` |
| `PUT /api/devices/:id` | positive integer `id` | - | same fields as device create |
| `DELETE /api/devices/:id` | positive integer `id` | - | - |
| `GET /api/contracts` | - | - | - |
| `GET /api/contracts/:id` | positive integer `id` | - | - |
| `POST /api/contracts` | - | - | `contract_no`; optional `fiscal_year_id`, `price_per_page` |
| `PUT /api/contracts/:id` | positive integer `id` | - | same fields as contract create |
| `DELETE /api/contracts/:id` | positive integer `id` | - | - |
| `GET /api/print-transactions` | - | optional single `month` | - |
| `GET /api/print-transactions/months` | - | - | - |
| `POST /api/print-transactions` | - | - | `device_id`, `month`, `pages` |
| `POST /api/print-transactions/bulk` | - | - | `month`, `items[]` containing `device_id` and optional `pages` |
| `GET /api/print-transactions/summary` | - | required `fiscal_year_id` | - |
| `GET /api/print-transactions/by-device/:deviceId` | positive integer `deviceId` | required `fiscal_year_id` | - |
| `POST /api/print-transactions/bulk-device` | - | - | `device_id`, `items[]` containing `month` and optional `pages` |
| `GET /api/dashboard/{monthly-kpi,summary-by-building,compare,stats,highlights}` | - | optional comma-separated `month`, `building_name`, `fiscal_year_id` | - |
| `GET /api/dashboard/{expense,by-department}` | - | optional single `month`, `building_name`, `fiscal_year_id` | - |
| `GET /api/expense/unassigned-devices` | - | - | - |
| `GET /api/expense/:fiscal_year_id` | positive integer `fiscal_year_id` | - | - |
| `POST /api/devices/import` | - | - | multipart `file` (`.xlsx`, `.xls`, or `.csv`) |
| `POST /api/print-transactions/import` | - | - | multipart `file` (`.xlsx`, `.xls`, or `.csv`) |

All `/api` routes except login require authentication. Device, contract,
master-data, fiscal-year, and import writes additionally require admin access.

## Endpoint coverage

| API group | Validated request sources |
| --- | --- |
| Authentication | Login body |
| Devices | ID params; create/update body |
| Contracts | ID params; create/update body |
| Brand, building, division | ID params; create/update body |
| Floor, department | ID params; child name and parent ID body |
| Fiscal years | ID params; create/update year body |
| Print transactions | Month/fiscal-year queries, device params, single and bulk bodies |
| Dashboard | Single- or multi-month query, building, fiscal-year ID |
| Expense | Fiscal-year route param |
| Imports | Multer upload limits, file metadata, workbook contents and row counts |

Routes with no caller-supplied params, query, body, or file have no empty
schema middleware. Authentication and authorization continue to run before
validation on protected routes.

## Device relationship checks

Device create and update reject a floor that is not part of the selected
building and a department that is not part of the selected division. A child
location also requires its parent. Brand and contract references are checked
before the device write. These checks run on the server; frontend dropdown
filtering is not treated as an integrity control.

## Bulk limits

- Monthly multi-device writes: at most 1,000 items.
- One-device month writes: at most 12 items.
- Spreadsheet imports: at most 5,000 data rows and a 5 MB upload.
- Meter values outside the database integer range and device text wider than
  its destination column are skipped with a row-level reason.

## Import file validation

Both import routes run the shared `importFileSchema` after Multer accepts the
upload. The early file filter remains only a disk-safety guard; the Zod schema
is the final metadata check. A supported extension or supported MIME type is
accepted so browsers that report Excel files as `application/octet-stream` do
not break the existing import flow. Upload/filter failures return a generic
client message while the detailed error is logged on the server.

## Shared schemas not yet wired to a route

`roleSchema` and `paginationSchema` live in the shared validation module so the
user-management and list endpoints can use the same contract when their
implementation is approved. The current API has no user-management endpoint
or validated pagination query in this Issue's scope, so wiring either schema
now would change an existing response contract without a consumer. They are
covered by unit tests and remain intentionally unused until a related feature
adds those public seams.

## Single print-transaction `pages` compatibility

The old `POST /api/print-transactions` handler converted a missing or blank
`pages` value to `0`. Issue #19 keeps the domain distinction that a blank value
means an unrecorded month while an explicit `0` is a valid recorded value.
Therefore the shared schema intentionally returns `400` for missing, blank, or
null `pages`, and accepts `pages: 0`. This is a deliberate compatibility
change: callers that have no reading must omit the single-write request, while
callers recording a zero must send an explicit numeric zero. The behavior is
covered by validation tests and matches the existing bulk-entry behavior.

## Login compatibility

Usernames are trimmed and limited to the existing 50-character database
column. Password characters, including leading and trailing spaces, are passed
to password comparison unchanged. Existing non-blank passwords remain accepted
regardless of length; the global JSON body-size limit protects the endpoint
without adding a new password-length compatibility break.

## Dashboard month-filter compatibility

Dashboard endpoints that aggregate charts and summaries continue to accept a
comma-separated month list. `/api/dashboard/expense` and
`/api/dashboard/by-department` accept only one month because their handlers
compare a single selected month. A comma-separated value now returns the shared
400 validation response instead of producing an empty or malformed result.
