# Project Current State and Team Workflow

เอกสารนี้เป็น checkpoint ของโปรเจกต์ ณ วันที่ 10 สิงหาคม 2026 สำหรับนักพัฒนาและ
AI session ใหม่ ให้อ่านคู่กับ `AGENTS.md` ก่อนเริ่มงาน ส่วนคำสั่งติดตั้งโดยละเอียดให้ใช้
`README.md` เป็น source of truth

## 1. Project Overview

- ชื่อ: **SUTH Hospital IT Asset Management**
- ระบบเว็บภายในสำหรับจัดการทรัพย์สิน IT ของโรงพยาบาล สัญญา ยอดพิมพ์ และค่าใช้จ่าย
- Backend: Node.js และ Express แบบ CommonJS
- Database: MySQL
- Frontend: Vue 3 และ Vite
- Repository หลัก: `WayuOHm99/SUTH-Hospital-IT-Asset-Management` (Private)
- Owner: `WayuOHm99`
- Collaborator: `UmmmAhhh` (สิทธิ์ write)

## 2. Repository History / Why New Repo

โค้ดเดิมอยู่ที่ `saritrungj/suth-helpdesk-assets` ปัจจุบัน repository หลักย้ายมาอยู่ใต้
owner `WayuOHm99` เพื่อให้ ownership ชัดเจนและจัดการ branches, pull requests,
repository workflow และ Project Board ได้โดยตรง

- `origin` ชี้ไปที่ repository หลักใหม่
- local `main` track `origin/main`
- `upstream` ชี้ไปที่ repository เดิม ใช้สำหรับ reference/compare เท่านั้น
- ห้าม push ไป `upstream`

แนวทางนี้ทำให้ทีมควบคุม workflow ได้เต็มรูปแบบ ขณะที่ยังเปรียบเทียบประวัติเดิมได้

## 3. Before → After

| พื้นที่ | ก่อน | หลัง | ดีขึ้นอย่างไร |
|---|---|---|---|
| Backend | entrypoint, routes และ logic อยู่หลายระดับ; app/server รวมกัน | source อยู่ใน `backend/src`; แยก `app.js`, `server.js`, `config`, `controllers`, `middleware`, `routes`, `modules`, `utils` | หาไฟล์ง่าย แยกความรับผิดชอบ และทดสอบได้ดีขึ้น |
| Dashboard | Express router รวม query/aggregation จำนวนมาก | route adapter แยกจาก `createDashboardController(db)` และรับ database adapter | ลด coupling และ unit-test โดยไม่ใช้ MySQL จริงได้ |
| Frontend | components อยู่รวมกันและ state อยู่ใน `store/` | components แบ่งเป็น `charts`, `feedback`, `forms`, `layout`, `tables`, `ui`; ใช้ `stores/` | navigation และ ownership ชัด รองรับการขยายต่อ |
| Database | migrations และ seed อยู่ปะปนระดับเดียว | แยก `schema.sql`, ordered `migrations/` และ development `seeds/` | แยก fresh install จาก upgrade path ชัดเจน |
| Documentation | เอกสารและ sample กระจาย มี path เก่า | แบ่ง `architecture/`, `handoff/`, `fixes/`, `samples/` และแก้ stale paths | ส่งต่องานและค้นบริบทได้เร็วขึ้น |
| Repository config | config กระจายระหว่าง frontend/backend | รวม `.gitignore`, `.editorconfig`, `.gitattributes`, `.vscode/extensions.json` ที่ root | กฎ repository สม่ำเสมอขึ้น |
| Cleanup | มี Excel ซ้ำ, template assets และ direct dependencies ที่ไม่ใช้ | นำ Excel ที่ไม่ยืนยันความปลอดภัยออกจาก Git, ลบ assets ที่ไม่มี reference, ถอด `csv-parser`/`iconv-lite` จาก direct dependencies และลบ `toggleMobileSidebar` ที่ไม่ใช้ | ลดความเสี่ยง ขนาด และสิ่งรบกวนโดยไม่ลบไฟล์ที่ยังมี reference |

โครงสร้างฐานข้อมูลปัจจุบัน:

```text
database/
├─ schema.sql
├─ migrations/
│  ├─ 001_unique_print_transactions.sql
│  └─ 002_add_fiscal_year_range.sql
└─ seeds/
   └─ seed_dummy_data.sql
```

- Fresh database ใช้ `database/schema.sql` เท่านั้น
- Existing database ใช้เฉพาะ migrations ที่ยังไม่เคยใช้ ตามลำดับเลข
- ห้ามสร้างฐานข้อมูลใหม่จาก schema แล้วรัน migrations ซ้ำโดยอัตโนมัติ

`.gitignore` ป้องกัน `.env`, dependencies, build/coverage output, uploads, temp/runtime
data, logs และ `docs/samples/source-device-register.xlsx` ที่ยังไม่ผ่านการ sanitize
ส่วน CORS อ่าน `CLIENT_ORIGIN` จาก environment และใช้ `http://localhost:5173`
เป็นค่า default สำหรับ local development

## 4. Quality / Validation Improvements

Issue #1 เพิ่ม Node.js test runner และ GitHub Actions CI ที่รัน Backend tests กับ
Frontend production build สถานะที่ตรวจจริงล่าสุด:

- Backend tests: 5/5 ผ่าน
- Frontend production build: ผ่าน (129 modules ใน validation ของ PR #2)
- HTTP smoke checks: ผ่านสำหรับ health, route ordering, protected routes และ 404
- relative import/path resolution: ผ่าน
- `git diff --check`: ผ่าน
- validation ของ PR #2 ครอบคลุม staged diff, generated/runtime paths และ secret-like patterns
- CI บน `main` หลัง merge: ผ่านที่ commit `814b79e6c34a2371afe9968fa52a3c9bce5d1315`

ส่วนที่ยังไม่ได้ยืนยันและห้ามอ้างว่าผ่าน:

- fresh schema และ migrations บน MySQL test database จริง
- authenticated/admin API flows แบบ end-to-end ที่เชื่อม MySQL test database

ติดตาม validation ที่เหลือใน Issue #5

## 5. GitHub Configuration

### Repository

- Repository: `WayuOHm99/SUTH-Hospital-IT-Asset-Management`
- Visibility: Private
- Default branch: `main`
- Owner: `WayuOHm99`
- Collaborator: `UmmmAhhh` (write)
- `origin/main` หลัง Issue #1: `814b79e6c34a2371afe9968fa52a3c9bce5d1315`

### Branch protection

Ruleset `Protect main` เปิดใช้งานและใช้กับ default branch สิ่งที่ GitHub API
ยืนยันได้คือป้องกัน branch deletion, ป้องกัน non-fast-forward update และกำหนดให้
การเปลี่ยนแปลงเข้าผ่าน pull request รายละเอียดอื่นที่ API ไม่เปิดเผยจะไม่ถือเป็น
ข้อกำหนดจนกว่าจะตรวจจาก GitHub UI

หลักปฏิบัติคือไม่พัฒนาหรือ commit งานโดยตรงบน `main`; ใช้ Issue, dedicated branch
และ pull request ทุกครั้ง

### AI rules

`AGENTS.md` เป็นกติกาหลักของ repository:

- เริ่ม development task จาก Issue และ dedicated branch
- ตรวจ branch และ `git status` ก่อนแก้; ถ้าอยู่ `main` ให้หยุดก่อน
- อ่านบริบท วิเคราะห์ และเสนอ plan ก่อน implement
- อยู่ใน scope และไม่แก้งานอื่นพ่วง
- ตรวจ diff และรัน validation ที่เกี่ยวข้องก่อน commit
- ห้าม commit, push, merge, delete branch, deploy หรืองานเสี่ยงโดยไม่มี approval
- schema/migration, auth/security, secrets, destructive และ production work ต้องขออนุมัติ

## 6. GitHub Project Board

Project: **SUTH Hospital IT Asset Management** (Private Project #1)

| Status | ความหมาย |
|---|---|
| Backlog | งานที่เปิดไว้และยังรอจัดลำดับ |
| Ready | เลือกแล้ว มี scope ชัด พร้อมเริ่ม |
| In Progress | กำลังพัฒนาบน dedicated branch |
| Review | implementation เสร็จ กำลัง review/test/PR |
| Done | merge และปิด Issue แล้ว |

Issue #1 อยู่ `Done`; follow-up Issues #3–#7 ถูกเพิ่มเข้า Project โดย automation
และเริ่มต้นที่ `Backlog`

## 7. Project Automations

GitHub API ยืนยันว่า workflows ต่อไปนี้เปิดใช้งาน:

| Workflow | สิ่งที่ตรวจยืนยันได้ |
|---|---|
| Auto-add to project | เปิดใช้งาน; Issues #3–#7 ถูกเพิ่มเข้า Project หลังสร้าง |
| Item added to project | เปิดใช้งาน; Issues #3–#7 ได้สถานะเริ่มต้น `Backlog` |
| Item closed | เปิดใช้งาน; Issue #1 ปัจจุบันอยู่ `Done` |
| Pull request linked to issue | เปิดใช้งาน |
| Item reopened | เปิดใช้งาน |

ยังมี workflows `Auto-add sub-issues to project`, `Auto-close issue` และ
`Pull request merged` เปิดใช้งานด้วย อย่างไรก็ตาม GitHub API แสดงชื่อและสถานะเปิดใช้
แต่ไม่แสดง filter/action ภายใน จึงยังไม่ยืนยันผ่าน API ว่า auto-add ใช้ filter ใด หรือ
PR-linked/reopened workflows ตั้งค่า status ใด ต้องตรวจรายละเอียดเหล่านี้จาก GitHub UI
ก่อนเปลี่ยน automation

## 8. Standard Development Workflow

```text
Issue → Backlog → Ready → Branch → AI Plan → AI Implementation
      → Test / Diff → Commit → Push → Pull Request → AI Review
      → Fix findings → Final CI / Review → Merge → Issue Closed → Done
```

สถานะ Project Board ต้องสะท้อนงานจริง ไม่ใช่ใช้แทน Issue หรือ pull request

## 9. วิธีเริ่มงานใหม่

1. สร้าง Issue ที่มี Goal, Scope, acceptance criteria ตามความจำเป็น และ risks/constraints
2. Assign ให้ `WayuOHm99` หรือ `UmmmAhhh` แล้วเปลี่ยน `Backlog → Ready`
3. ก่อน coding ให้ sync `main` และตรวจว่า worktree สะอาด:

   ```sh
   git switch main
   git pull --ff-only origin main
   git status
   ```

4. สร้าง branch จาก `main` ด้วยรูปแบบ `<type>/<issue-number>-<short-description>` เช่น
   `feat/12-device-export`, `fix/15-login-session`, `chore/18-update-ci`
5. เปลี่ยน `Ready → In Progress`
6. ให้ AI อ่าน `AGENTS.md`, Issue และ source ที่เกี่ยวข้อง แล้วเสนอ plan ก่อน implement

## 10. วิธีใช้ Codex / AI

AI เป็นตัวหลักสำหรับ repository analysis, planning, coding/refactor, tests, diff review,
PR preparation และ code review แต่ต้องทำงานภายใต้ Issue และ `AGENTS.md`

AI ต้องไม่ merge หรือ deploy เองโดยไม่มี approval, เปลี่ยน schema/security แบบเสี่ยง,
discard งานคนอื่น, force push โดยไม่จำเป็น หรือขยาย scope โดยพลการ งานใหญ่ใช้ลำดับ
`Issue → AI Plan → clear plan/approval → implementation`

## 11. วิธีทำงานร่วมกันระหว่าง WayuOHm99 และ UmmmAhhh

### ก่อนเริ่มงาน

- ดู Project Board และเลือก Issue ที่ `Ready`
- Assign ตัวเอง; ห้ามสองคนทำ Issue เดียวกันโดยไม่ตกลงกัน
- sync `main` แล้วสร้าง branch แยกคนละงาน ห้ามพัฒนาบน `main`

### ระหว่างทำและส่งงาน

- push branch ของตัวเองได้ และอัปเดต Issue/PR เมื่อมี blocker
- ไม่แก้ไฟล์นอก scope โดยไม่จำเป็น
- เมื่อเสร็จให้รัน tests, inspect diff, commit, push และเปิด PR
- เชื่อม Issue ด้วย `Closes #N`

### Review และ merge

- ให้ AI review ก่อน; เมื่อมี finding ใช้ `fix → test → push → review ใหม่`
- merge เมื่อ scope ครบ, validation/CI ผ่าน, review ไม่มี blocker และได้ approval ที่ต้องการ
- หลัง merge ให้ยืนยัน Issue ปิดและ Board เป็น `Done`, sync local `main` และ cleanup branch

## 12. Definition of Done

Issue ถือว่า Done เมื่อ requirements ครบ, ไม่มี known blocker, tests ที่เกี่ยวข้องและ CI
ผ่าน, PR ถูก review และ merge เข้า `main`, Issue ปิด และ Project Status เป็น `Done`
การเขียนโค้ดเสร็จเพียงอย่างเดียวยังไม่ถือว่า Done

## 13. Completed Work — Issue #1

- [Issue #1](https://github.com/WayuOHm99/SUTH-Hospital-IT-Asset-Management/issues/1): `chore: reorganize repository structure`
- Branch: `chore/1-reorganize-repository`
- [PR #2](https://github.com/WayuOHm99/SUTH-Hospital-IT-Asset-Management/pull/2): `chore: reorganize repository structure`
- กระบวนการ: reorganize → tests → Draft PR → AI review → แก้ findings → re-review
  → CI ผ่าน → Ready for review → final check → squash merge
- Merge commit: `814b79e6c34a2371afe9968fa52a3c9bce5d1315`
- Issue #1: Closed / Completed / Project Status `Done`
- CI บน `main` หลัง merge: Success

Issue #1 เป็นหลักฐานว่า workflow แบบ Issue-to-PR และ Project automation ใช้งานจริงได้

## 14. Known Follow-ups / Remaining Risks

| Issue | งานที่เหลือ | สถานะเริ่มต้น |
|---|---|---|
| [Issue #3](https://github.com/WayuOHm99/SUTH-Hospital-IT-Asset-Management/issues/3) `security: replace xlsx dependency` | ประเมิน parser ใหม่แทน `xlsx@0.18.5` ซึ่ง npm audit รายงาน high severity และไม่มี registry fix | Backlog |
| [Issue #4](https://github.com/WayuOHm99/SUTH-Hospital-IT-Asset-Management/issues/4) `docs: sanitize sample device register workbook` | ตรวจและเปลี่ยน workbook ให้เป็น mock data 100% ก่อนนำกลับเข้า Git | Backlog |
| [Issue #5](https://github.com/WayuOHm99/SUTH-Hospital-IT-Asset-Management/issues/5) `test: verify MySQL migrations and authenticated API flows` | ทดสอบ fresh/upgrade path และ authenticated flows บน test database | Backlog |
| [Issue #6](https://github.com/WayuOHm99/SUTH-Hospital-IT-Asset-Management/issues/6) `chore: update GitHub Actions runtime dependencies` | แก้ runtime warning ของ `actions/checkout@v4` และ `actions/setup-node@v4` ใน PR แยก | Backlog |

[Issue #7](https://github.com/WayuOHm99/SUTH-Hospital-IT-Asset-Management/issues/7)
ใช้ส่งมอบเอกสาร checkpoint ฉบับนี้ผ่าน documentation-only PR

## 15. Quick Start — พรุ่งนี้เริ่มยังไง

```text
1. git switch main
2. git pull --ff-only origin main
3. เปิด GitHub Project
4. เลือก Issue จาก Backlog → Ready
5. Assign คนทำ
6. สร้าง branch จาก main
7. ให้ Codex อ่าน AGENTS.md + Issue + เอกสารนี้
8. Plan → Implement → Test → PR → Review → Merge
```
