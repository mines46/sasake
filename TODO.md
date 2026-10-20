# SasaKe Academy — Roadmap & Technical TODO

This document tracks upcoming backend migrations and architectural enhancements, prioritizing **backend session-based billing calculations** and **server-side PDF generation** for official tuition receipts (*recibos*).

---

## 📌 Phase 1: Backend Session-Based Attendance Billing Engine (Go)

Currently, the billing calculation logic is prototyped on the frontend in `frontend/src/utils/billingCalculator.ts`. This logic must be migrated to the Go backend (`backend/`) as the authoritative source of truth.

### 1.1 Business Logic & Rules
- [x] **Billing Formula:**
  - $\text{Billable Sessions} = \text{Count}(\text{present}) + \text{Count}(\text{late}) + \mathbf{\text{Count}}(\mathbf{\text{absent}})$
  - **Unexcused Absences Rule:** An absence without a validated medical or official excuse (`absent`) is counted as assisted and is fully billable.
  - **Excused Absences Rule:** Validated absences (`excused`) are exempted ($0.00).
  - $\text{Class Subtotal (cents)} = \text{Billable Sessions} \times \text{cost\_per\_session\_cents}$
  - $\text{Invoice Total (cents)} = \sum(\text{Class Subtotals}) - \text{discount\_cents}$
- [x] **Financial Precision:** Preserve all monetary calculations strictly in integer cents (no floating-point rounding bugs).

### 1.2 Database & SQL Layer (`database/`)
- [x] Ensure `cost_per_session_cents INT NOT NULL DEFAULT 0` is migrated into `classes`.
- [x] Add performance index for date-range attendance queries:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_attendance_student_date 
  ON attendance(student_id, date);
  ```
- [x] Write optimized query to aggregate attendance for an active enrollment within a date range:
  ```sql
  SELECT 
      c.id AS class_id,
      c.name AS class_name,
      c.cost_per_session_cents,
      COUNT(a.id) FILTER (WHERE a.status = 'present') AS present_count,
      COUNT(a.id) FILTER (WHERE a.status = 'late') AS late_count,
      COUNT(a.id) FILTER (WHERE a.status = 'absent') AS unexcused_count,
      COUNT(a.id) FILTER (WHERE a.status = 'excused') AS excused_count
  FROM enrollments e
  JOIN classes c ON e.class_id = c.id
  LEFT JOIN attendance a ON a.student_id = e.student_id 
                         AND a.class_id = c.id 
                         AND a.date BETWEEN $2 AND $3
  WHERE e.student_id = $1 AND e.status = 'active'
  GROUP BY c.id, c.name, c.cost_per_session_cents;
  ```

### 1.3 REST API Endpoints (`backend/handlers/`)
- [x] **Preview Billing Calculation:**
  - `POST /api/invoices/calculate-attendance`
  - **Request Body:**
    ```json
    {
      "student_id": "f873752e-5612-4f36-9b51-3cfd81b37991",
      "start_date": "2026-09-01",
      "end_date": "2026-09-30",
      "discount_cents": 0
    }
    ```
  - **Response Body:** Itemized preview with subtotal, breakdown per class (attended, unexcused, excused), and total due.
- [x] **Generate & Store Invoice / Recibo:**
  - `POST /api/invoices/generate-attendance`
  - Runs in a PostgreSQL transaction (`pgx.Tx`):
    1. Inserts into `invoices` with auto-generated `invoice_number` (`REC-YYYY-XXXX`).
    2. Inserts line items into `invoice_items` (`quantity` = billable sessions, `unit_price_cents` = session price).
    3. Returns the full enriched `Invoice` object.
- [x] **Batch Generation & 10-per-A4 Grid Optimization:**
  - `POST /api/invoices/generate-batch`
  - Batch generates receipts for multiple students in a single transaction.
  - Formats receipts into a 10-per-A4 page print layout ($2 \times 5$ grid).
  - Validates multiples of 10: warns when count is not a multiple of 10 and provides options to auto-fill remainder with blank slips or auto-select more students.

---

## 📌 Phase 2: Server-Side PDF Generation (Recibos Oficiales)

Currently, receipts are displayed in an HTML modal and printed via browser `window.print()`. This must be replaced with server-side PDF compilation to produce immutable, downloadable PDF documents.

### 2.1 Technology Selection
- [ ] Evaluate Go PDF library candidates:
  - **Option A (Recommended):** [`maroto`](https://github.com/johnfercher/maroto) (Declarative, fast, grid-based PDF generator designed for receipts and invoices in Go).
  - **Option B:** [`gofpdf`](https://github.com/jung-kurt/gofpdf) (Traditional low-level canvas API).
  - **Option C:** HTML-to-PDF template rendering (e.g. Go templates + headless Chrome / Chromium).

### 2.2 Official Recibo Slip Specification (Matching Reference Template)
- [x] **Frontend Visual Template:** Implemented in `OfficialReceiptModal.tsx` matching reference image:
  - **Outer Frame:** Solid black border box grid.
  - **Top-Left Cell:** Official "ENCINA" seal with detailed oak tree emblem and spreading roots.
  - **Top-Right Cells:**
    - "Fecha:" + `DD/MM/YYYY` (Spanish date format, e.g. `02/04/2025`).
    - "Nº Recibo:" + `YYYY-XXXX` sequence (e.g. `2025-0078`).
  - **Student Row:** "Alumno:" + uppercase full name (`NOMBRE APELLIDO APELLIDO`).
  - **Concept Row:** "Concepto:" + Class title (`CLASE`) and group / session detail (`GRUPO`).
  - **Amount Row:** "Importe:" + formatted Euro currency (`0,00 €`).
  - **Footer Terms:** `"Plazo de pago, 5 días naturales desde su entrega"`.
- [ ] **Server-Side PDF Compilation (Go):**
  - Render the identical compact ENCINA receipt card layout to a downloadable PDF via `GET /api/invoices/{id}/pdf`.

### 2.3 PDF Endpoint Contract
- [ ] `GET /api/invoices/{id}/pdf`
  - Header: `Content-Type: application/pdf`
  - Header: `Content-Disposition: inline; filename="recibo-2025-0078.pdf"`
  - Optional query param: `?download=true` for `Content-Disposition: attachment`.

---

## 📌 Phase 3: Frontend Client Integration (`frontend/`)

- [x] Update `frontend/src/components/AttendanceInvoiceGeneratorModal.tsx`:
  - Connected to backend `invoiceApi.generateAttendanceInvoice()`.
  - Supports live student rosters and offline fallback.
- [x] Update `frontend/src/components/OfficialReceiptModal.tsx`:
  - Render exact "ENCINA" official receipt slip matching user specification.
  - Print-ready with `@media print` CSS for physical receipt slips.
- [ ] Add "Download Official PDF" button linking to `/api/invoices/{id}/pdf?download=true`.

---

## 📌 Phase 4: Additional Academy Modules
- [x] **Students Module (`/students`):** Full CRUD for student and guardian profiles (UI + Go backend endpoints + PostgreSQL).
- [x] **Classes & Courses Module (`/classes`):** Course management with `cost_per_session_cents` editing (UI + Go backend endpoints + PostgreSQL).
- [x] **Attendance Matrix (`/attendance`):** Bulk roll-call logging per class date with unexcused (billed) vs excused (waived) policy (UI + Go backend endpoints + PostgreSQL).
- [x] **Priority Billing Module (`/invoices`):** Attendance-driven invoice generation and receipts (UI + Go backend endpoints + PostgreSQL).
- [ ] **Timetable & Scheduling (`/schedule`):** Weekly calendar grid with room allocation conflict detection.

---

## 📌 Phase 5: Authentication & Role-Based Access Control (RBAC)
- [x] **Database Schema & User Management:**
  - `users` table created in `database/schema.sql` with `email`, `username`, `password_hash`, `full_name`, `role` (`admin` | `teacher`), `is_active`, and timestamps.
  - Automatic migration and seeding of default accounts in `backend/cmd/initdb/main.go` and `store/user_store.go`.
- [x] **Secure Password Architecture:**
  - Salted SHA-256 with 16-byte random salt and constant-time verification (`crypto/subtle.ConstantTimeCompare`).
  - Implemented using Go standard library (`backend/utils/auth_utils.go`).
- [x] **Backend Authentication Endpoints (`backend/handlers/auth_handler.go`):**
  - `POST /api/auth/login`: Simplified to **Username** and **Password** (email stored in DB for alerts and user records).
  - `GET /api/auth/me`: Retrieves current user profile.
  - `GET /api/users`: Restricted to `admin` role.
  - `POST /api/users`: Restricted to `admin` role (allows creating new teachers and admins with full profile including email).
  - `DELETE /api/users/{id}`: Restricted to `admin` role.
  - 100% test coverage with unit tests in `backend/handlers/auth_handler_test.go`.
- [x] **Frontend Role-Based Access Control (`frontend/`):**
  - **Login View (`LoginPage.tsx`):** Clean and fast Username and Password login with demo fill buttons for Admin and Teacher.
  - **Admin Role View (`AdminUsersPage.tsx`):** Dedicated console exclusively for user management (metrics, user table, add user modal, delete actions, logout). No access to operational teaching tabs.
  - **Teacher Role View:** Full access to the academy management application (Dashboard, Students, Classes, Attendance, Billing & Recibos 10-per-A4).
  - Seamless persistence with `localStorage` and offline fallback support.

---

## 📌 Phase 6: Class Modality & Database Reset & Fresh Seed
- [x] **Class Modalities (`group` vs `individual`):**
  - Added `class_type` column to `classes` table with check constraint (`group`, `individual`).
  - **Group Classes (`group`):** Invoiced in advance for the month, billing all scheduled session occurrences.
  - **Individual Classes (`individual`):** Invoiced based on attendance roll calls (unexcused absences billed, excused waived).
- [x] **Clean Database Reset & Fresh Seed:**
  - Automated migration engine in `backend/cmd/seeddb/main.go`.
  - Purged old records cleanly using `TRUNCATE ... CASCADE`.
  - Populated with clean, realistic production seed data:
    - 2 Users (`admin` & `profesor`)
    - 6 Classes (4 Group [advance], 2 Individual [attendance])
    - 9 Recurring weekly schedule slots
    - 20 Students (exact multiple of 10 for batch A4 printing)
    - 22 Enrollments
    - 13 Attendance logs demonstrating unexcused vs excused handling
    - 10 Official Recibos matching the 10-per-A4 layout
  - Synchronized `frontend/src/data/mockData.ts` to 100% parity.

---

## 📌 Phase 7: Billing Module Redesign
- [x] **Dedicated Modality Sections:**
  - **👥 Clases Grupales (Facturación Adelantada):** Automatically computes monthly recurring sessions per course based on schedule; shows enrolled students, fees, and allows batch generation and 10-per-A4 printing.
  - **👤 Clases Individuales (Facturación por Asistencia):** Real-time breakdown of roll call (asistidas, faltas no justificadas facturadas, justificadas exentas) with 1-click batch generation.
  - **📑 Historial & Control de Recibos:** Full invoice ledger with status filter tabs (Todos, Pendientes, Pagados, Vencidos) and class type filter.
- [x] **⚡ Fast Quick-Pay Action:** 1-click "Cobrar" button directly in the pending/overdue rows to immediately record payment without modals.
- [x] **Interactive 10-per-A4 Batch Printing:** Multi-selection with automatic check for multiples of 10, warning modal for non-multiples with choice to print clean blank slips or adjust selection.
