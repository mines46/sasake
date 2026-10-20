/**
 * Utilities for formatting values according to SasaKe rules:
 * - Integer cents to currency strings
 * - Date & Time parsing
 */

export function formatCents(cents: number, currency: string = 'EUR'): string {
  const amount = cents / 100;
  if (currency === 'EUR') {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatEuros(cents: number): string {
  const amount = cents / 100;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateSpanish(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatReceiptNumber(rawNumber: string): string {
  if (!rawNumber) return '2025-0001';
  // If it contains "REC-YYYY-XXXX", strip "REC-"
  if (rawNumber.startsWith('REC-')) {
    return rawNumber.substring(4);
  }
  if (rawNumber.startsWith('inv-')) {
    const year = new Date().getFullYear();
    const num = rawNumber.replace(/\D/g, '').padStart(4, '0');
    return `${year}-${num}`;
  }
  return rawNumber;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatTime(timeString: string): string {
  if (!timeString) return '';
  const parts = timeString.split(':');
  if (parts.length < 2) return timeString;
  
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 hour is 12 AM
  return `${hours}:${minutes} ${ampm}`;
}

export function getDayName(dayNumber: number): string {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days[dayNumber - 1] || 'Unknown';
}
