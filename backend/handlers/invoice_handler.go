package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"sasake-backend/models"
	"sasake-backend/store"
)

type InvoiceHandler struct {
	store store.InvoiceStore
}

func NewInvoiceHandler(store store.InvoiceStore) *InvoiceHandler {
	return &InvoiceHandler{store: store}
}

// RegisterRoutes mounts invoice REST endpoints onto a chi.Router
func (h *InvoiceHandler) RegisterRoutes(r chi.Router) {
	r.Get("/", h.ListInvoices)
	r.Get("/{id}", h.GetInvoice)
	r.Post("/calculate-attendance", h.CalculateAttendanceBilling)
	r.Post("/generate-attendance", h.GenerateAttendanceInvoice)
	r.Post("/generate-batch", h.GenerateBatchInvoices)
	r.Put("/{id}/status", h.UpdateInvoiceStatus)
	r.Delete("/{id}", h.DeleteInvoice)
}

func (h *InvoiceHandler) ListInvoices(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	search := r.URL.Query().Get("search")

	invoices, err := h.store.GetAll(r.Context(), status, search)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to list invoices: "+err.Error())
		return
	}

	if invoices == nil {
		invoices = []models.EnrichedInvoice{}
	}

	writeJSON(w, http.StatusOK, invoices)
}

func (h *InvoiceHandler) GetInvoice(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeJSONError(w, http.StatusBadRequest, "invoice id is required")
		return
	}

	inv, err := h.store.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeJSONError(w, http.StatusNotFound, "invoice not found")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to get invoice: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, inv)
}

func (h *InvoiceHandler) CalculateAttendanceBilling(w http.ResponseWriter, r *http.Request) {
	var input models.CalculateBillingInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	input.StudentID = strings.TrimSpace(input.StudentID)
	input.StartDate = strings.TrimSpace(input.StartDate)
	input.EndDate = strings.TrimSpace(input.EndDate)

	if input.StudentID == "" {
		writeJSONError(w, http.StatusBadRequest, "student_id is required")
		return
	}
	if input.StartDate == "" || input.EndDate == "" {
		writeJSONError(w, http.StatusBadRequest, "start_date and end_date are required (YYYY-MM-DD)")
		return
	}

	result, err := h.store.CalculateAttendanceBilling(r.Context(), input)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to calculate billing: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *InvoiceHandler) GenerateAttendanceInvoice(w http.ResponseWriter, r *http.Request) {
	var input models.GenerateInvoiceInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	input.StudentID = strings.TrimSpace(input.StudentID)
	input.StartDate = strings.TrimSpace(input.StartDate)
	input.EndDate = strings.TrimSpace(input.EndDate)

	if input.StudentID == "" {
		writeJSONError(w, http.StatusBadRequest, "student_id is required")
		return
	}
	if input.StartDate == "" || input.EndDate == "" {
		writeJSONError(w, http.StatusBadRequest, "start_date and end_date are required (YYYY-MM-DD)")
		return
	}

	invoice, err := h.store.GenerateAttendanceInvoice(r.Context(), input)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to generate invoice: "+err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, invoice)
}

func (h *InvoiceHandler) GenerateBatchInvoices(w http.ResponseWriter, r *http.Request) {
	var input models.BatchGenerateInvoiceInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	input.StartDate = strings.TrimSpace(input.StartDate)
	input.EndDate = strings.TrimSpace(input.EndDate)

	if len(input.StudentIDs) == 0 {
		writeJSONError(w, http.StatusBadRequest, "student_ids array must not be empty")
		return
	}
	if input.StartDate == "" || input.EndDate == "" {
		writeJSONError(w, http.StatusBadRequest, "start_date and end_date are required (YYYY-MM-DD)")
		return
	}

	invoices, err := h.store.GenerateBatchAttendanceInvoices(r.Context(), input)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to generate batch invoices: "+err.Error())
		return
	}

	if invoices == nil {
		invoices = []models.EnrichedInvoice{}
	}

	writeJSON(w, http.StatusCreated, invoices)
}

func (h *InvoiceHandler) UpdateInvoiceStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeJSONError(w, http.StatusBadRequest, "invoice id is required")
		return
	}

	var input models.UpdateInvoiceStatusInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	switch input.Status {
	case models.InvoiceStatusDraft, models.InvoiceStatusPending, models.InvoiceStatusPaid, models.InvoiceStatusOverdue, models.InvoiceStatusCancelled:
		// Valid
	default:
		writeJSONError(w, http.StatusBadRequest, "invalid status '"+string(input.Status)+"', must be draft, pending, paid, overdue, or cancelled")
		return
	}

	updated, err := h.store.UpdateStatus(r.Context(), id, input)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeJSONError(w, http.StatusNotFound, "invoice not found")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to update status: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, updated)
}

func (h *InvoiceHandler) DeleteInvoice(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeJSONError(w, http.StatusBadRequest, "invoice id is required")
		return
	}

	if err := h.store.Delete(r.Context(), id); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeJSONError(w, http.StatusNotFound, "invoice not found")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to delete invoice: "+err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

