# RACE SAMPLES — Production-Ready Laboratory Sample Reporting System

**RACE SAMPLES** is an enterprise-grade laboratory administration web application for importing, analyzing, managing, and exporting camel CBC (Complete Blood Count) race sample reports.

The system strictly enforces regulatory positivity rules based on Hemoglobin (HGB) and Hematocrit (HCT) thresholds, reproducing official laboratory report designs with precision, bilingual Arabic and English typography, and automated multi-format exports.

---

## 1. Key Features & Capabilities

- **Automated Positivity Calculation**:
  - HGB Threshold: $\ge 14.0\text{ g/dL}$ $\rightarrow$ `POSITIVE`
  - HCT Threshold: $\ge 32.0\%$ $\rightarrow$ `POSITIVE`
  - **BOTH POSITIVE**: Satisfied only when **BOTH** conditions are met ($HGB \ge 14.0\text{ g/dL}$ **AND** $HCT \ge 32.0\%$).
  - Decimal-safe boundary comparison logic preserving measurement precision.
- **Excel Import Workflow**:
  - Drag-and-drop file upload supporting `.xlsx` and legacy `.xls` files.
  - Automatic column detection with manual mapping overrides.
  - Pre-commit preview displaying valid, invalid, duplicate, and calculated positivity statuses.
  - Transactional MySQL persistence with batch insertion and row-level error logging.
- **Formal Laboratory Report Generation**:
  - Faithfully recreates the official laboratory report layout from the reference specifications.
  - Configurable branding: First Lab logo, Camel Racing Committee emblem, and official validation stamps.
  - Bilingual typography with RTL Arabic headers and LTR tabular data.
  - Explanatory threshold note banner.
  - Interactive toggling between **Full Results (7 columns)** and **Positive Only (4 columns)**.
- **High-Fidelity Exports**:
  - **Excel (.xlsx)** via ExcelJS: Styled headers, navy fill, zebra striping, borders, freeze panes, and auto-filters.
  - **PDF** via PDFKit: Vector-rendered A4 reports, pagination, header repetition, and validation stamps.
- **Real MySQL Database & Prisma ORM**:
  - Authoritative data storage (no client-side mock data).
  - Version-controlled migrations, decimal column types, foreign keys, and audit logging.
- **Administrative Security**:
  - Password hashing with bcrypt (12 salt rounds).
  - Session tokens via HTTP-only, SameSite cookies with JWT verification.

---

## 2. Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript (Strict Mode), Tailwind CSS, Lucide React icons.
- **Backend**: Next.js Route Handlers, Edge-ready middleware, Zod validation.
- **Database**: MySQL 8+ / MariaDB 10.4+, Prisma ORM.
- **File Processing**: ExcelJS, XLSX parser, PDFKit.
- **Testing**: Jest, ts-jest, Next.js test runner.

---

## 3. Prerequisites

- **Node.js**: `v18.17.0` or higher (`v20.9.0` recommended).
- **npm**: `v9.0.0` or higher.
- **MySQL / MariaDB**: Server running on port `3306`.

---

## 4. Quick Start & Installation

### 1. Clone & Install Dependencies
```bash
cd "o:/Race Sample"
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your database credentials and secret key are set:
```ini
DATABASE_URL="mysql://root:@127.0.0.1:3306/race_samples"
SESSION_SECRET="race_samples_super_secret_session_key_2026_qatar_first_lab_secure"
APP_URL="http://localhost:3000"

ADMIN_INITIAL_USERNAME="admin"
ADMIN_INITIAL_PASSWORD="Admin@RaceSamples2026"
```

### 3. Initialize MySQL Database & Run Migrations
Create the database in MySQL:
```sql
CREATE DATABASE IF NOT EXISTS race_samples CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Run Prisma schema sync:
```bash
npm run prisma:generate
npm run prisma:push
```

### 4. Seed Database
Seed the administrator account, application settings, and reference report (`RC-0001`):
```bash
npm run db:seed
```

### 5. Start Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000`. You will be redirected to `/login`.

Default administrator credentials:
- **Username**: `admin`
- **Password**: `Admin@RaceSamples2026`

---

## 5. Production Build & Deployment

To generate an optimized production bundle:
```bash
npm run build
npm run start
```

---

## 6. Automated Testing

Run the full test suite (unit and integration tests):
```bash
npm test
```

### Test Coverage
- `tests/unit/calculation.test.ts`:
  - $HGB = 14.0, HCT = 32.0 \rightarrow$ Both `POSITIVE`, `YES`
  - $HGB = 14.0, HCT = 31.99 \rightarrow$ `POSITIVE` / `NEGATIVE`, `NO`
  - $HGB = 13.99, HCT = 32.0 \rightarrow$ `NEGATIVE` / `POSITIVE`, `NO`
  - $HGB = 13.99, HCT = 31.99 \rightarrow$ Both `NEGATIVE`, `NO`
  - Custom historical threshold validation.
- `tests/integration/workflow.test.ts`:
  - Excel workbook parsing and column autodetection.
  - ExcelJS Full & Positive report generation.
  - Server-side PDFKit report generation.
  - Admin authentication and JWT session validation.

---

## 7. Database Backup & Restore

### Backup
```bash
mysqldump -u root -p race_samples > race_samples_backup.sql
```

### Restore
```bash
mysql -u root -p race_samples < race_samples_backup.sql
```

---

## 8. Application Navigation

1. **Dashboard** (`/dashboard`): Live MySQL statistics, distribution bars, recent reports, and audit activity.
2. **Import Excel** (`/import`): Excel upload dropzone, column mapping, validation preview, and persistence.
3. **All Samples** (`/samples`): Searchable, filterable, and paginated table of all sample records with edit and delete capabilities.
4. **Positive Samples** (`/positive-samples`): Filtered view showing ONLY both-positive samples with sequential SN and red numerical styling.
5. **Reports** (`/reports`): Report archive, summary cards, and quick download actions.
6. **Report Preview** (`/reports/[id]`): Bilingual formal laboratory report with A4 print view and direct PDF/Excel downloads.
7. **Import History** (`/history`): Audit logs of imported files and row-level rejection details.
8. **Settings** (`/settings`): Configurable thresholds, organization branding, report notes, and password management.
