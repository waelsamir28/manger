import type { ScreenId } from "./types";

export const SCREEN_LABELS: Record<ScreenId, string> = {
  home: "الرئيسية",
  sale: "فاتورة مبيعات",
  purchase: "فاتورة مشتريات",
  saleReturn: "مرتجع مبيعات",
  purchaseReturn: "مرتجع مشتريات",
  prices: "بيان أسعار",
  products: "الأصناف",
  customers: "العملاء",
  suppliers: "الموردين",
  employees: "الموظفين",
  treasury: "الخزينة",
  expenses: "المصروفات",
  cashOut: "دفع نقدية",
  cashIn: "إستلام نقدية",
  attendance: "حضور وانصراف",
  transfers: "تحويلات مخازن",
  stats: "إحصائيات",
  warehouses: "المخازن",
  accounts: "الحسابات",
  reports: "التقارير",
  settings: "الإعدادات",
  maintenance: "الصيانة",
  install: "تثبيت سطح المكتب",
  statement: "كشف حساب",
  installments: "التقسيط",
  profits: "الأرباح",
  contact: "اتصل بنا",
};

export const STAGES = ["الكل", "ابتدائي", "إعدادي", "ثانوي"] as const;

export const UNITS = ["قطعة", "علبة", "دستة", "مجموعة", "كتاب", "رزمة", "باكت"];

export const EXPENSE_CATEGORIES = ["إيجار", "كهرباء", "مياه", "مرتبات", "نقل", "تغليف", "صيانة", "نثرية", "أخرى"];

export const PAYMENT_TYPES = ["نقدي", "آجل", "فيزا"] as const;

export const PRICE_TYPES = ["قطاعي", "جملة"] as const;

export const JOBS = ["كاشير", "مبيعات", "أمين مخزن", "محاسبة", "مدير"];

export function stockOf(stocks: { warehouseId: number; qty: number }[] | undefined, warehouseId?: number) {
  if (!stocks?.length) return 0;
  if (!warehouseId) return stocks.reduce((sum, row) => sum + Number(row.qty || 0), 0);
  return Number(stocks.find((row) => row.warehouseId === warehouseId)?.qty || 0);
}
