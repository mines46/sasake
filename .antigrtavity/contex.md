# Project Context: SasaKe (Academy Management Web Application)

### 1. Overview
SasaKe is a full-stack web application designed for academy management. It handles student profiles, class scheduling and timetables, daily attendance tracking, and multi-item tuition invoicing and billing ("recibos").

### 2. Priority Scope: Session-Based Attendance Invoicing & Billing
* **Class Configuration:** Every class specifies a **cost per session** in integer cents (`cost_per_session_cents`, e.g. `$25.00` = `2500`).
* **Attendance-Driven Billing Rules:**
  * Student invoices ("recibos") are calculated based on the sessions attended within a billing period.
  * **Billable Sessions:**
    1. Attended sessions (`present`, `late`).
    2. **Unexcused Absences (`absent`):** If a student misses a class without an excuse, **it counts as assisted and is fully billable**.
  * **Non-Billable Sessions:**
    1. **Excused Absences (`excused`):** Validated excused absences are exempted from the billing calculation.
  * **Calculation Formula:**
    $$\text{Billable Sessions} = \text{Count}(\text{present}) + \text{Count}(\text{late}) + \text{Count}(\text{absent})$$
    $$\text{Class Total Cents} = \text{Billable Sessions} \times \text{cost\_per\_session\_cents}$$
    $$\text{Invoice Total Cents} = \sum(\text{Class Total Cents}) - \text{discount\_cents}$$

### 3. Architecture & Tech Stack
* **Repository Root:** Contains shared configuration (`.env`), database migrations/scripts (`database/`), backend service (`backend/`), and frontend client (`frontend/`).
* **Backend:** Go (Golang) using the `chi/v5` router, `pgx/v5` for PostgreSQL connection pooling, and `cors`.
* **Database:** PostgreSQL running in a Docker container on an Oracle Cloud virtual server.
* **Frontend:** React + TypeScript + Vite + Tailwind CSS.
* **API Style:** RESTful JSON endpoints prefixed under `/api/...`.

### 4. Core Database Entities (`database/schema.sql`)
* `students`: Core personal, contact, and emergency guardian records.
* `classes`: Course definitions, instructor assignments, capacities, and `cost_per_session_cents`.
* `enrollments`: Many-to-many link between students and classes.
* `class_schedules`: Recurring weekly time slots (`day_of_week`, `start_time`, `end_time`, `room`).
* `attendance`: Daily presence logging per student per class (`present`, `absent`, `late`, `excused`).
* `invoices`: Financial records with auto-calculated integer cent values (`subtotal_cents`, `discount_cents`, `total_cents`) and status lifecycle (`draft`, `pending`, `paid`, `overdue`, `cancelled`).
* `invoice_items`: Individual billable line items attached to an invoice (`quantity` = billable sessions, `unit_price_cents` = cost per session).

### 5. Development Conventions
* **Environment:** Secrets and environment variables live in the root `/.env` and are loaded by Go via `godotenv.Load("../.env")`.
* **Financial Integrity:** Always represent money in minor units (integer cents, e.g., `$50.00` = `5000`) across PostgreSQL, Go structs, and TypeScript types to avoid precision loss.
* **Type Symmetry:** Backend Go structs and frontend TypeScript interfaces must match JSON keys explicitly.
* **Code Style:** Clean separation of concerns (handlers, models, and stores in Go; reusable components, pages, and API hooks in React).