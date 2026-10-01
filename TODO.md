# SasaKe Academy — Roadmap & Technical TODO

This document tracks upcoming backend migrations and architectural enhancements, prioritizing **backend session-based billing calculations** and **server-side PDF generation** for official tuition receipts (*recibos*).

---

## 📌 Phase 1: Backend Session-Based Attendance Billing Engine (Go)

Currently, the billing calculation logic is prototyped on the frontend in `frontend/src/utils/billingCalculator.ts`. This logic must be migrated to the Go backend (`backend/`) as the authoritative source of truth.

### 1.1 Business Logic & Rules
- [ ] **Billing Formula:**
  - $\text{Billable Sessions} = \text{Count}(\text{present}) + \text{Count}(\text{late}) + \mathbf{\text{Count}}(\mathbf{\text{absent}})$
  - **Unexcused Absences Rule:** An absence without a validated medical or official excuse (`absent`) is counted as assisted and is fully billable.
  - **Excused Absences Rule:** Validated absences (`excused`) are exempted ($0.00).
  - $\text{Class Subtotal (cents)} = \text{Billable Sessions} \times \text{cost\_per\_session\_cents}$
  - $\text{Invoice Total (cents)} = \sum(\text{Class Subtotals}) - \text{discount\_cents}$
- [ ] **Financial Precision:** Preserve all monetary calculations strictly in integer cents (no floating-point rounding bugs).

### 1.2 Database & SQL Layer (`database/`)
- [ ] Ensure `cost_per_session_cents INT NOT NULL DEFAULT 0` is migrated into `classes`.
- [ ] Add performance index for date-range attendance queries:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_attendance_student_date 
  ON attendance(student_id, date);
  ```
- [ ] Write optimized query to aggregate attendance for an active enrollment within a date range:
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
- [ ] **Preview Billing Calculation:**
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
- [ ] **Generate & Store Invoice / Recibo:**
  - `POST /api/invoices/generate-attendance`
  - Runs in a PostgreSQL transaction (`pgx.Tx`):
    1. Inserts into `invoices` with auto-generated `invoice_number` (`REC-YYYY-XXXX`).
    2. Inserts line items into `invoice_items` (`quantity` = billable sessions, `unit_price_cents` = session price).
    3. Returns the full enriched `Invoice` object.

---

## 📌 Phase 2: Server-Side PDF Generation (Recibos Oficiales)

Currently, receipts are displayed in an HTML modal and printed via browser `window.print()`. This must be replaced with server-side PDF compilation to produce immutable, downloadable PDF documents.

### 2.1 Technology Selection
- [ ] Evaluate Go PDF library candidates:
  - **Option A (Recommended):** [`maroto`](https://github.com/johnfercher/maroto) (Declarative, fast, grid-based PDF generator designed for receipts and invoices in Go).
  - **Option B:** [`gofpdf`](https://github.com/jung-kurt/gofpdf) (Traditional low-level canvas API).
  - **Option C:** HTML-to-PDF template rendering (e.g. Go templates + headless Chrome / Chromium).

### 2.2 Recibo PDF Design Specification
- [ ] **Header:** Academy letterhead, logo, official registration details, and contact info.
- [ ] **Metadata Block:** Receipt number (`REC-2026-XXXX`), issue date, due date, payment status.
- [ ] **Student & Guardian Section:** Student full name, email, emergency guardian name and phone.
- [ ] **Attendance Breakdown Table:**
  - Course Name
  - Attended Sessions (`present` + `late`)
  - Unexcused Absences Billed (`absent`)
  - Excused Absences Waived (`excused`)
  - Unit Price per Session ($)
  - Line Total ($)
- [ ] **Summary Box:** Subtotal, Discounts, Net Total Due (in formatted currency from cents).
- [ ] **Status Stamp:** High-resolution vector stamp:
  - `PAGADO / PAID` (Green stamp with timestamp and payment reference).
  - `PENDIENTE / PENDING` (Amber stamp with due date).
- [ ] **Policy Disclaimer:** Official academy policy note stating that unexcused absences count as assisted and are billed.

### 2.3 PDF Endpoint Contract
- [ ] `GET /api/invoices/{id}/pdf`
  - Header: `Content-Type: application/pdf`
  - Header: `Content-Disposition: inline; filename="recibo-REC-2026-0142.pdf"`
  - Optional query param: `?download=true` for `Content-Disposition: attachment`.

---

## 📌 Phase 3: Frontend Client Integration (`frontend/`)

Once backend endpoints are ready:
- [ ] Update `frontend/src/components/AttendanceInvoiceGeneratorModal.tsx`:
  - Replace client-side `calculateStudentAttendanceBilling()` with `axios.post('/api/invoices/calculate-attendance')`.
  - Replace client-side invoice creation with `axios.post('/api/invoices/generate-attendance')`.
- [ ] Update `frontend/src/components/OfficialReceiptModal.tsx`:
  - Add "Download Official PDF" button linking to `/api/invoices/{id}/pdf?download=true`.
  - Add embedded PDF viewer `<iframe src="/api/invoices/{id}/pdf" />` for browser viewing.
- [ ] Deprecate `frontend/src/utils/billingCalculator.ts` or retain solely for offline fallback.

---

## 📌 Phase 4: Additional Academy Modules
- [ ] **Students Module (`/students`):** Full CRUD for student and guardian profiles.
- [ ] **Classes & Courses Module (`/classes`):** Course management with `cost_per_session_cents` editing.
- [ ] **Timetable & Scheduling (`/schedule`):** Weekly calendar grid with room allocation conflict detection.
- [ ] **Attendance Matrix (`/attendance`):** Bulk roll-call logging per class date.
