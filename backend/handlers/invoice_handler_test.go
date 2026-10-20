package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"sasake-backend/models"
	"sasake-backend/store"
)

type mockInvoiceStore struct {
	invoices []models.EnrichedInvoice
}

func newMockInvoiceStore() *mockInvoiceStore {
	return &mockInvoiceStore{
		invoices: make([]models.EnrichedInvoice, 0),
	}
}

func (m *mockInvoiceStore) GetAll(ctx context.Context, status string, search string) ([]models.EnrichedInvoice, error) {
	var list []models.EnrichedInvoice
	for _, inv := range m.invoices {
		if status != "" && status != "all" && string(inv.Status) != status {
			continue
		}
		if search != "" {
			q := strings.ToLower(search)
			if !strings.Contains(strings.ToLower(inv.InvoiceNumber), q) && !strings.Contains(strings.ToLower(inv.StudentName), q) {
				continue
			}
		}
		list = append(list, inv)
	}
	return list, nil
}

func (m *mockInvoiceStore) GetByID(ctx context.Context, id string) (*models.EnrichedInvoice, error) {
	for _, inv := range m.invoices {
		if inv.ID == id || inv.InvoiceNumber == id {
			return &inv, nil
		}
	}
	return nil, store.ErrNotFound
}

func (m *mockInvoiceStore) CalculateAttendanceBilling(ctx context.Context, input models.CalculateBillingInput) (*models.BillingCalculationResult, error) {
	// Simulate: Student has 1 class (Cost: $25.00 = 2500 cents)
	// 6 present, 1 late, 1 unexcused absent (Billed!), 1 excused (Waived!)
	// Billable = 6 + 1 + 1 = 8 sessions.
	// Total = 8 * 2500 = 20000 cents ($200.00).
	costPerSession := 2500
	present := 6
	late := 1
	unexcused := 1
	excused := 1
	billable := (present + late) + unexcused // 8
	subtotal := billable * costPerSession   // 20000

	classID := "c1"
	desc := "Piano Solo (Individual) — 8 billable sessions (7 attended, 1 unexcused absent)"
	cType := "individual"
	isAdv := false

	items := []models.InvoiceItem{
		{
			ID:                   "item-1",
			Description:          desc,
			Quantity:             billable,
			UnitPriceCents:       costPerSession,
			TotalCents:           subtotal,
			ClassID:              &classID,
			ClassType:            &cType,
			IsAdvanceBilling:     &isAdv,
			PresentCount:         &present,
			LateCount:            &late,
			UnexcusedAbsentCount: &unexcused,
			ExcusedCount:         &excused,
		},
	}

	breakdown := []models.ClassBillingBreakdown{
		{
			ClassID:             classID,
			ClassName:           "Piano Solo",
			ClassType:           "individual",
			IsAdvanceBilling:    false,
			CostPerSessionCents: costPerSession,
			PresentCount:        present,
			LateCount:           late,
			UnexcusedCount:      unexcused,
			ExcusedCount:        excused,
			BillableSessions:    billable,
			TotalCents:          subtotal,
		},
	}

	netTotal := subtotal - input.DiscountCents
	if netTotal < 0 {
		netTotal = 0
	}

	return &models.BillingCalculationResult{
		StudentID:              input.StudentID,
		StartDate:              input.StartDate,
		EndDate:                input.EndDate,
		ClassesBreakdown:       breakdown,
		InvoiceItems:           items,
		TotalBillableSessions:  billable,
		TotalAttendedSessions:  present + late,
		TotalUnexcusedAbsences: unexcused,
		TotalExcusedAbsences:   excused,
		SubtotalCents:          subtotal,
		DiscountCents:          input.DiscountCents,
		TotalCents:             netTotal,
	}, nil
}

func (m *mockInvoiceStore) GenerateAttendanceInvoice(ctx context.Context, input models.GenerateInvoiceInput) (*models.EnrichedInvoice, error) {
	calc, _ := m.CalculateAttendanceBilling(ctx, models.CalculateBillingInput{
		StudentID:     input.StudentID,
		StartDate:     input.StartDate,
		EndDate:       input.EndDate,
		DiscountCents: input.DiscountCents,
	})

	inv := models.EnrichedInvoice{
		Invoice: models.Invoice{
			ID:            "mock-inv-1",
			InvoiceNumber: "REC-2026-0001",
			StudentID:     input.StudentID,
			IssueDate:     time.Now().Format("2006-01-02"),
			DueDate:       input.DueDate,
			SubtotalCents: calc.SubtotalCents,
			DiscountCents: calc.DiscountCents,
			TotalCents:    calc.TotalCents,
			Status:        models.InvoiceStatusPending,
			Notes:         input.Notes,
			CreatedAt:     time.Now(),
		},
		StudentName:  "Elena Rostova",
		StudentEmail: "elena.rostova@example.com",
		Items:        calc.InvoiceItems,
	}

	m.invoices = append(m.invoices, inv)
	return &inv, nil
}

func (m *mockInvoiceStore) GenerateBatchAttendanceInvoices(ctx context.Context, input models.BatchGenerateInvoiceInput) ([]models.EnrichedInvoice, error) {
	var results []models.EnrichedInvoice
	for _, studentID := range input.StudentIDs {
		inv, err := m.GenerateAttendanceInvoice(ctx, models.GenerateInvoiceInput{
			StudentID:     studentID,
			StartDate:     input.StartDate,
			EndDate:       input.EndDate,
			DueDate:       input.DueDate,
			DiscountCents: input.DiscountCents,
			Notes:         input.Notes,
		})
		if err != nil {
			return nil, err
		}
		results = append(results, *inv)
	}
	return results, nil
}

func (m *mockInvoiceStore) UpdateStatus(ctx context.Context, id string, input models.UpdateInvoiceStatusInput) (*models.EnrichedInvoice, error) {
	for i, inv := range m.invoices {
		if inv.ID == id || inv.InvoiceNumber == id {
			m.invoices[i].Status = input.Status
			if input.Status == models.InvoiceStatusPaid {
				now := time.Now()
				m.invoices[i].PaidAt = &now
			}
			return &m.invoices[i], nil
		}
	}
	return nil, store.ErrNotFound
}

func (m *mockInvoiceStore) Delete(ctx context.Context, id string) error {
	for i, inv := range m.invoices {
		if inv.ID == id {
			m.invoices = append(m.invoices[:i], m.invoices[i+1:]...)
			return nil
		}
	}
	return store.ErrNotFound
}

func setupInvoiceTestRouter(handler *InvoiceHandler) *chi.Mux {
	r := chi.NewRouter()
	r.Route("/api/invoices", func(sub chi.Router) {
		handler.RegisterRoutes(sub)
	})
	return r
}

func TestInvoiceHandler_AttendanceBillingFlow(t *testing.T) {
	mockStore := newMockInvoiceStore()
	handler := NewInvoiceHandler(mockStore)
	router := setupInvoiceTestRouter(handler)

	// 1. Calculate Attendance-Driven Tuition
	calcReq := models.CalculateBillingInput{
		StudentID:     "student-1",
		StartDate:     "2026-09-01",
		EndDate:       "2026-09-30",
		DiscountCents: 1000, // $10.00 discount
	}
	calcBytes, _ := json.Marshal(calcReq)
	req := httptest.NewRequest(http.MethodPost, "/api/invoices/calculate-attendance", bytes.NewReader(calcBytes))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for calculate attendance, got %d: %s", rec.Code, rec.Body.String())
	}

	var calcResult models.BillingCalculationResult
	if err := json.Unmarshal(rec.Body.Bytes(), &calcResult); err != nil {
		t.Fatalf("failed to decode calculation result: %v", err)
	}

	// Verify unexcused absences were billed: 7 attended + 1 unexcused = 8 billable sessions
	if calcResult.TotalBillableSessions != 8 {
		t.Errorf("expected 8 billable sessions (7 attended + 1 unexcused), got %d", calcResult.TotalBillableSessions)
	}
	if calcResult.SubtotalCents != 20000 { // 8 * 2500 = $200.00
		t.Errorf("expected subtotal 20000 cents, got %d", calcResult.SubtotalCents)
	}
	if calcResult.TotalCents != 19000 { // 20000 - 1000 = 19000 cents ($190.00)
		t.Errorf("expected total 19000 cents, got %d", calcResult.TotalCents)
	}

	// 2. Generate Invoice
	genReq := models.GenerateInvoiceInput{
		StudentID:     "student-1",
		StartDate:     "2026-09-01",
		EndDate:       "2026-09-30",
		DueDate:       "2026-10-10",
		DiscountCents: 1000,
	}
	genBytes, _ := json.Marshal(genReq)
	req = httptest.NewRequest(http.MethodPost, "/api/invoices/generate-attendance", bytes.NewReader(genBytes))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created for generate invoice, got %d", rec.Code)
	}

	var created models.EnrichedInvoice
	_ = json.Unmarshal(rec.Body.Bytes(), &created)
	if created.InvoiceNumber != "REC-2026-0001" {
		t.Errorf("expected invoice number REC-2026-0001, got %s", created.InvoiceNumber)
	}
	if len(created.Items) != 1 {
		t.Errorf("expected 1 line item, got %d", len(created.Items))
	}

	// 3. Get Invoice by ID
	req = httptest.NewRequest(http.MethodGet, "/api/invoices/"+created.ID, nil)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200 OK for get invoice, got %d", rec.Code)
	}

	// 4. Update Status to Paid
	statusReq := models.UpdateInvoiceStatusInput{
		Status: models.InvoiceStatusPaid,
	}
	statusBytes, _ := json.Marshal(statusReq)
	req = httptest.NewRequest(http.MethodPut, "/api/invoices/"+created.ID+"/status", bytes.NewReader(statusBytes))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200 OK for status update, got %d", rec.Code)
	}

	var paid models.EnrichedInvoice
	_ = json.Unmarshal(rec.Body.Bytes(), &paid)
	if paid.Status != models.InvoiceStatusPaid || paid.PaidAt == nil {
		t.Errorf("expected status paid with non-nil paid_at, got %+v", paid)
	}

	// 5. Delete Invoice
	req = httptest.NewRequest(http.MethodDelete, "/api/invoices/"+created.ID, nil)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Errorf("expected 204 No Content for delete, got %d", rec.Code)
	}
}

func TestInvoiceHandler_GenerateBatchInvoices(t *testing.T) {
	mockStore := newMockInvoiceStore()
	handler := NewInvoiceHandler(mockStore)
	router := setupInvoiceTestRouter(handler)

	// Valid batch generation request for 2 students
	notes := "Monthly batch October"
	batchReq := models.BatchGenerateInvoiceInput{
		StudentIDs: []string{"stu-1", "stu-2"},
		StartDate:  "2026-10-01",
		EndDate:    "2026-10-31",
		DueDate:    "2026-11-05",
		Notes:      &notes,
	}
	body, _ := json.Marshal(batchReq)
	req := httptest.NewRequest(http.MethodPost, "/api/invoices/generate-batch", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created for batch generate, got %d: %s", rec.Code, rec.Body.String())
	}

	var results []models.EnrichedInvoice
	if err := json.Unmarshal(rec.Body.Bytes(), &results); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("expected 2 invoices generated, got %d", len(results))
	}

	// Validation check: empty student IDs
	emptyReq := models.BatchGenerateInvoiceInput{
		StudentIDs: []string{},
		StartDate:  "2026-10-01",
		EndDate:    "2026-10-31",
	}
	emptyBody, _ := json.Marshal(emptyReq)
	req = httptest.NewRequest(http.MethodPost, "/api/invoices/generate-batch", bytes.NewReader(emptyBody))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request for empty students, got %d", rec.Code)
	}
}


