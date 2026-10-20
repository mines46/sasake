import axios from 'axios';
import type { 
  EnrichedInvoice, 
  InvoiceStatus, 
  CalculateBillingInput, 
  GenerateInvoiceInput, 
  BatchGenerateInvoiceInput,
  BillingCalculationResult 
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

export const invoiceApi = {
  /**
   * List all invoices, optionally filtered by status and search query
   */
  async getAll(status?: string, search?: string): Promise<EnrichedInvoice[]> {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (search) params.append('search', search);

    const res = await api.get<EnrichedInvoice[]>(`/invoices?${params.toString()}`);
    return res.data;
  },

  /**
   * Get an invoice by its ID or receipt number
   */
  async getById(id: string): Promise<EnrichedInvoice> {
    const res = await api.get<EnrichedInvoice>(`/invoices/${id}`);
    return res.data;
  },

  /**
   * Request the backend billing engine to compute attendance tuition preview
   */
  async calculateAttendanceBilling(input: CalculateBillingInput): Promise<BillingCalculationResult> {
    const res = await api.post<BillingCalculationResult>('/invoices/calculate-attendance', input);
    return res.data;
  },

  /**
   * Generate an official attendance invoice/recibo and store it in PostgreSQL
   */
  async generateAttendanceInvoice(input: GenerateInvoiceInput): Promise<EnrichedInvoice> {
    const res = await api.post<EnrichedInvoice>('/invoices/generate-attendance', input);
    return res.data;
  },

  /**
   * Generate official attendance invoices/recibos in a batch for multiple students
   */
  async generateBatch(input: BatchGenerateInvoiceInput): Promise<EnrichedInvoice[]> {
    const res = await api.post<EnrichedInvoice[]>('/invoices/generate-batch', input);
    return res.data;
  },

  /**
   * Update invoice payment status (e.g. mark paid)
   */
  async updateStatus(id: string, status: InvoiceStatus, paidAt?: string): Promise<EnrichedInvoice> {
    const res = await api.put<EnrichedInvoice>(`/invoices/${id}/status`, {
      status,
      paid_at: paidAt,
    });
    return res.data;
  },

  /**
   * Delete an invoice
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/invoices/${id}`);
  },
};

