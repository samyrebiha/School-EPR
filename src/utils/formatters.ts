/**
 * Formats a number to Algerian DZD currency with thousands separators.
 * e.g., 125000 -> "125,000 دج"
 */
export function formatDZD(amount: number, includeCurrency = true): string {
  const formatted = new Intl.NumberFormat('fr-DZ', {
    maximumFractionDigits: 0,
  }).format(amount).replace(/\s/g, ',');

  return includeCurrency ? `${formatted} دج` : formatted;
}

/**
 * Formats a date to Arabic localized standard.
 * e.g. "2026-08-30" -> "30 أوت 2026"
 */
export function formatDateArabic(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('ar-DZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Formats Algerian phone numbers with clear spacing.
 * e.g. "0550123456" -> "0550 12 34 56"
 */
export function formatAlgerianPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)}`;
  }
  return phone;
}

/**
 * Returns label and badge variant for payment status.
 */
export function getPaymentStatusInfo(status: 'paid' | 'partial' | 'unpaid' | 'overdue') {
  switch (status) {
    case 'paid':
      return { label: 'مدفوع بالكامل', variant: 'success' as const };
    case 'partial':
      return { label: 'دفع جزئي', variant: 'warning' as const };
    case 'unpaid':
      return { label: 'غير مدفوع', variant: 'neutral' as const };
    case 'overdue':
      return { label: 'متأخر عن الدفع', variant: 'danger' as const };
  }
}

/**
 * Returns label and badge variant for general status.
 */
export function getGeneralStatusInfo(status: 'active' | 'inactive' | 'archived' | 'completed' | 'upcoming') {
  switch (status) {
    case 'active':
      return { label: 'نشط', variant: 'success' as const };
    case 'inactive':
      return { label: 'غير نشط', variant: 'neutral' as const };
    case 'archived':
      return { label: 'مؤرشف', variant: 'neutral' as const };
    case 'completed':
      return { label: 'مكتمل', variant: 'info' as const };
    case 'upcoming':
      return { label: 'قريبًا', variant: 'warning' as const };
  }
}

/**
 * Returns Arabic label for payment method.
 */
export function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'cash':
      return 'نقداً (Cash)';
    default:
      return method;
  }
}

/**
 * Converts Algerian Dinar numerical amount to spelled-out Arabic words (تفقيط المبلغ).
 */
export function formatDZDInWords(amount: number): string {
  if (amount === 0) return 'صفر دينار جزائري';
  
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertGroup(n: number): string {
    let result = '';
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;
    const to = n % 100;

    if (h > 0) result += hundreds[h];
    if (to > 0) {
      if (result) result += ' و';
      if (to < 20) {
        result += ones[to];
      } else {
        if (o > 0) result += ones[o] + ' و';
        result += tens[t];
      }
    }
    return result;
  }

  const thousands = Math.floor(amount / 1000);
  const remainder = amount % 1000;

  let words = '';
  if (thousands > 0) {
    if (thousands === 1) words += 'ألف';
    else if (thousands === 2) words += 'ألفان';
    else if (thousands >= 3 && thousands <= 10) words += convertGroup(thousands) + ' آلاف';
    else words += convertGroup(thousands) + ' ألف';
  }

  if (remainder > 0) {
    if (words) words += ' و';
    words += convertGroup(remainder);
  }

  return words ? `${words} دينار جزائري فقط لا غير` : `${formatDZD(amount)} فقط لا غير`;
}
