export function r2(n: number) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export function money(n: number | null | undefined) {
  const v = Number(n || 0);
  return v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function qtyText(n: number | null | undefined) {
  const v = Number(n || 0);
  if (Number.isInteger(v)) return String(v);
  return r2(v).toFixed(2);
}

export function cairoDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatDate(value: string | Date) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatClock(date = new Date()) {
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: "Africa/Cairo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    numberingSystem: "latn",
  }).format(date);
}

export function formatLongDate(date = new Date()) {
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: "Africa/Cairo",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    numberingSystem: "latn",
  }).format(date);
}

export function daysUntil(isoDate: string) {
  const end = new Date(`${isoDate}T23:59:59+02:00`).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((end - now) / 86400000));
}

export function docLabel(docType: string) {
  switch (docType) {
    case "sale":
      return "فاتورة مبيعات";
    case "purchase":
      return "فاتورة مشتريات";
    case "saleReturn":
      return "مرتجع مبيعات";
    case "purchaseReturn":
      return "مرتجع مشتريات";
    default:
      return docType;
  }
}

export function sourceLabel(source: string) {
  const map: Record<string, string> = {
    sale: "مبيعات",
    purchase: "مشتريات",
    saleReturn: "مرتجع بيع",
    purchaseReturn: "مرتجع شراء",
    receipt: "استلام نقدية",
    payment: "دفع نقدية",
    expense: "مصروف",
    salary: "راتب",
    adjust: "تسوية",
    void: "إلغاء فاتورة",
    opening: "رصيد افتتاحي",
  };
  return map[source] ?? source;
}
