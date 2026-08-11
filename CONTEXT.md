# Hospital Printer Usage and Asset Management

This context defines the language used to describe printer meter readings,
usage, billing, reporting periods, and missing monthly data in the hospital's
IT asset-management system.

## Language

**Meter Reading (เลขมิเตอร์)**:
The cumulative page counter observed on a device for a particular month or
event.
_Avoid_: Monthly usage, pages printed

**Opening Reading (เลขมิเตอร์ตั้งต้น)**:
The first Meter Reading in a sequence, used as a baseline for later usage. An
Opening Reading does not itself produce Gross Usage.
_Avoid_: First-month usage, starting usage

**Gross Usage (ยอดใช้จริงก่อนหัก)**:
The number of pages consumed between two consecutive Meter Readings, calculated
as the later reading minus the earlier reading.
_Avoid_: Meter Reading, print total

**Deducted Pages (จำนวนที่หัก)**:
Twenty percent of Gross Usage that is excluded from billing under the
hospital's reporting policy.
_Avoid_: Discount amount, net pages

**Deduction Policy (นโยบายหักยอด)**:
The effective-dated percentage excluded from billing. The approved rate for the
current scope is twenty percent, and historical reports retain the rate that
was effective at the time.
_Avoid_: Scattered hard-coded rate, user discount

**Billable Pages (ยอดคิดเงิน)**:
Eighty percent of Gross Usage remaining after Deducted Pages are removed.
_Avoid_: Gross Usage, Meter Reading

**Printing Cost (ค่าใช้จ่าย)**:
The amount charged for a reporting period, equal to Billable Pages multiplied
by the effective price per page.
_Avoid_: Billable Pages, gross cost

**Billing Terms (เงื่อนไขการคิดเงิน)**:
The time-bounded contract and effective price per page applied to usage while
those terms are in force. Later changes do not alter historical Printing Cost.
_Avoid_: Current contract, current price

**Effective Price (ราคาที่ใช้จริง)**:
The approved device-specific price for a usage interval when one exists,
otherwise the contract price effective for that interval. If neither exists,
Printing Cost is unpriced rather than zero.
_Avoid_: Current price, missing-as-zero

**Unrecorded Month (เดือนที่ยังไม่กรอก)**:
A month for which no Meter Reading exists. A recorded zero is a Meter Reading,
not an Unrecorded Month.
_Avoid_: Zero usage, zero reading

**Incomplete Usage Interval (ช่วงยอดไม่สมบูรณ์)**:
A span containing an Unrecorded Month for which Gross Usage cannot be assigned
accurately to each individual month. Usage in this span is not guessed,
averaged, or silently assigned to a later month.
_Avoid_: Zero usage, estimated month

**Meter Reset (การรีเซ็ตมิเตอร์)**:
An explicit event that starts a new Meter Reading sequence after a counter is
reset or replaced. It records the old and new values, effective time, reason,
and responsible person.
_Avoid_: Lower Meter Reading, corrected usage

**Device Assignment (การประจำการของเครื่อง)**:
The time-bounded placement of a device at a particular organizational and
physical location.
_Avoid_: Device status, current location

**Assignment Location (สถานที่ประจำการ)**:
The organizational and physical location of a Device Assignment: building,
floor, division, department, and room or area, with optional precise location,
contact, internal phone, and notes.
_Avoid_: Device status, free-form location only

**Device Transfer (การโยกย้ายเครื่อง)**:
An event that ends one Device Assignment and begins another at a recorded time
and Meter Reading.
_Avoid_: Device edit, retirement, repair

**Transfer Correction (การแก้ประวัติย้าย)**:
An append-only correction that supersedes an incorrect Device Transfer while
preserving the original event, reason, time, and responsible person.
_Avoid_: Transfer deletion, location edit

**Device Lifecycle Status (สถานะเครื่อง)**:
The operational condition of a device, such as active, under repair, or
retired, independent of its Device Assignment.
_Avoid_: Device Transfer, Assignment Location

**Usage Allocation (การจัดสรรยอดใช้)**:
The attribution of Gross Usage to the Device Assignment active while the usage
occurred, split at Meter Readings captured by Device Transfers.
_Avoid_: Current department total, manual subtraction

**Latest System Month (เดือนล่าสุดของระบบ)**:
The most recent month for which at least one device has a Meter Reading.
_Avoid_: Latest Device Reading

**Latest Device Reading (เลขมิเตอร์ล่าสุดของเครื่อง)**:
The most recent Meter Reading recorded for one specific device, including its
month and value.
_Avoid_: Latest System Month

**Reporting Window (ช่วงรายงาน)**:
The selected time span used for usage and cost reporting: one month, a rolling
three-month period, a rolling six-month period, a Thai fiscal year, or a custom
month range.
_Avoid_: Fixed quarter, fixed half-year

**Comparable Device Usage (ยอดที่ใช้จัดอันดับ)**:
Complete, valid Gross Usage for a device within a Reporting Window. A valid
zero is comparable; incomplete usage is excluded and reported separately.
_Avoid_: Unrecorded usage, missing-as-zero

**Usage Ranking (อันดับการใช้งาน)**:
The ordering of devices with Comparable Device Usage within the current
Reporting Window and filters. Gross Usage is the default ranking measure;
Billable Pages and Printing Cost are explicit alternatives.
_Avoid_: Missing-data ranking, lifetime ranking

**Canonical Report (รายงานหลัก)**:
The single trusted reporting surface for usage, deductions, billing, data
completeness, filters, rankings, and device-level detail.
_Avoid_: Expense report, comparison page, department report

**Device-by-Month Matrix (ตารางเครื่องแยกเดือน)**:
A report with one row per device and one column per selected month, showing one
chosen measure consistently across the filtered Reporting Window.
_Avoid_: Nested device accordion, mixed-metric cells

**Thai Fiscal Year (ปีงบประมาณ)**:
The government reporting year that begins in October and ends in September of
the following calendar year.
_Avoid_: Calendar year

**Import Preview (ตัวอย่างก่อนนำเข้า)**:
A validated, non-writing view of every proposed import change, including
accepted rows, replacements, skips, and field-level errors, shown before the
user confirms the import.
_Avoid_: Import result, automatic import

**Asset Import (การนำเข้าทรัพย์สิน)**:
A create-only batch of new devices. An existing serial number is skipped and
reported rather than overwritten.
_Avoid_: Bulk asset update, asset replacement

**Meter Reading Import (การนำเข้าเลขมิเตอร์)**:
A batch of cumulative Meter Readings matched by device serial number and month.
Replacing a reading requires explicit confirmation and preserves the prior
value as history.
_Avoid_: Monthly usage import, silent upsert

**Import Template (แม่แบบนำเข้า)**:
The documented field contract for one import type, provided as an instructed
XLSX workbook and an equivalent UTF-8 CSV file.
_Avoid_: Example-only file, undocumented spreadsheet

**Administrator (ผู้ดูแลระบบ)**:
A system user who manages assets, imports, transfers, meter resets, historical
corrections, master data, and user accounts.
_Avoid_: Staff, viewer

**Staff (ผู้บันทึกข้อมูล)**:
A system user who reads operational data and reports and records or corrects
Meter Readings for the current reporting month.
_Avoid_: Administrator, viewer

**Viewer (ผู้ดูรายงาน)**:
A read-only system user who can view permitted operational data and reports but
cannot change system state.
_Avoid_: Staff, Administrator

**Deactivated Account (บัญชีที่ปิดใช้งาน)**:
A user account that can no longer authenticate but remains identifiable in
historical activity and audit records.
_Avoid_: Deleted user, anonymous actor

**Historical Reading Correction (การแก้เลขมิเตอร์ย้อนหลัง)**:
An Administrator-authorized change to a Meter Reading before the current
reporting month, preserving the prior value, reason, time, and responsible
person.
_Avoid_: Current-month entry, silent overwrite

**Legacy Monthly Usage (ยอดรายเดือนเดิม)**:
Trustworthy historical monthly usage that has no source Meter Readings. It
remains reportable with its source identified but is never converted into
invented Meter Readings or split across unsupported transfer boundaries.
_Avoid_: Meter Reading, fabricated history

**Verified Historical Context (บริบทย้อนหลังที่ยืนยันแล้ว)**:
Assignment Location and Billing Terms supported by trustworthy effective-date
evidence. Values before the earliest verified date remain unknown.
_Avoid_: Current-value backfill, assumed history

**Device-Month Cost (ค่าใช้จ่ายรายเครื่องต่อเดือน)**:
The Printing Cost for one device and month, rounded to two currency places.
Report totals are the sum of Device-Month Costs.
_Avoid_: Unrounded report total, whole-period rounding

**Incomplete Total (ยอดรวมไม่สมบูรณ์)**:
A subtotal calculated from known values while one or more readings, usage
intervals, assignments, or prices remain unknown. It is always labelled with
the missing-data counts and is never presented as a complete or zero-filled
total.
_Avoid_: Complete total, missing-as-zero
