import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  storeName: text("store_name").notNull(),
  activity: text("activity").notNull(),
  phone: text("phone").notNull(),
  phone2: text("phone2"),
  website: text("website"),
  email: text("email"),
  address: text("address"),
  taxPercent: doublePrecision("tax_percent").notNull().default(0),
  allowNegative: boolean("allow_negative").notNull().default(false),
  autoFillPaid: boolean("auto_fill_paid").notNull().default(true),
  footerNote: text("footer_note"),
  cashierName: text("cashier_name").notNull().default("admin"),
  currency: text("currency").notNull().default("ج.م"),
  season: text("season").notNull().default("2026-2027"),
  installmentMonths: integer("installment_months").notNull().default(4),
  downPercent: doublePrecision("down_percent").notNull().default(25),
  lateFee: doublePrecision("late_fee").notNull().default(0),
  returnDays: integer("return_days").notNull().default(7),
  bookReturnDays: integer("book_return_days").notNull().default(3),
  defaultPayment: text("default_payment").notNull().default("نقدي"),
  theme: text("theme").notNull().default("classic"),
  loginUser: text("login_user").notNull().default("admin"),
  loginPin: text("login_pin").notNull().default("1234"),
});

export const installmentPlans = pgTable("installment_plans", {
  id: serial("id").primaryKey(),
  number: integer("number").notNull(),
  customerId: integer("customer_id").notNull(),
  customerName: text("customer_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  total: doublePrecision("total").notNull(),
  downPayment: doublePrecision("down_payment").notNull().default(0),
  months: integer("months").notNull(),
  monthlyAmount: doublePrecision("monthly_amount").notNull(),
  paidAmount: doublePrecision("paid_amount").notNull().default(0),
  status: text("status").notNull().default("جاري"),
  notes: text("notes"),
  treasuryId: integer("treasury_id"),
});

export const installmentDues = pgTable("installment_dues", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  dueNo: integer("due_no").notNull(),
  dueDate: text("due_date").notNull(),
  amount: doublePrecision("amount").notNull(),
  paid: doublePrecision("paid").notNull().default(0),
  status: text("status").notNull().default("مستحق"),
});

export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  notes: text("notes"),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  kind: text("kind").notNull().default("stationery"),
});

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    categoryId: integer("category_id").notNull(),
    unit: text("unit").notNull().default("قطعة"),
    costPrice: doublePrecision("cost_price").notNull().default(0),
    salePrice: doublePrecision("sale_price").notNull().default(0),
    wholesalePrice: doublePrecision("wholesale_price").notNull().default(0),
    taxPercent: doublePrecision("tax_percent").notNull().default(0),
    minStock: integer("min_stock").notNull().default(5),
    grade: text("grade"),
    subject: text("subject"),
    stage: text("stage"),
    publisher: text("publisher"),
    active: boolean("active").notNull().default(true),
  },
  (table) => [uniqueIndex("products_code_idx").on(table.code)],
);

export const stocks = pgTable(
  "stocks",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id").notNull(),
    warehouseId: integer("warehouse_id").notNull(),
    qty: doublePrecision("qty").notNull().default(0),
  },
  (table) => [uniqueIndex("stocks_product_wh_idx").on(table.productId, table.warehouseId)],
);

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  balance: doublePrecision("balance").notNull().default(0),
  priceType: text("price_type").notNull().default("قطاعي"),
  isSystem: boolean("is_system").notNull().default(false),
  notes: text("notes"),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  balance: doublePrecision("balance").notNull().default(0),
  notes: text("notes"),
});

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  jobTitle: text("job_title").notNull(),
  phone: text("phone"),
  salary: doublePrecision("salary").notNull().default(0),
  hireDate: text("hire_date"),
  active: boolean("active").notNull().default(true),
});

export const treasuries = pgTable("treasuries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  balance: doublePrecision("balance").notNull().default(0),
  kind: text("kind").notNull().default("cash"),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  docType: text("doc_type").notNull(),
  number: integer("number").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  partyId: integer("party_id"),
  partyName: text("party_name").notNull(),
  warehouseId: integer("warehouse_id").notNull(),
  treasuryId: integer("treasury_id"),
  paymentType: text("payment_type").notNull(),
  priceType: text("price_type").notNull(),
  discountPercent: doublePrecision("discount_percent").notNull().default(0),
  discountAmount: doublePrecision("discount_amount").notNull().default(0),
  taxAmount: doublePrecision("tax_amount").notNull().default(0),
  deliveryFee: doublePrecision("delivery_fee").notNull().default(0),
  subtotal: doublePrecision("subtotal").notNull().default(0),
  total: doublePrecision("total").notNull().default(0),
  paid: doublePrecision("paid").notNull().default(0),
  changeAmount: doublePrecision("change_amount").notNull().default(0),
  previousBalance: doublePrecision("previous_balance").notNull().default(0),
  notes: text("notes"),
  status: text("status").notNull().default("saved"),
  cashier: text("cashier").notNull().default("admin"),
  sourceInvoiceId: integer("source_invoice_id"),
});

export const documentItems = pgTable("document_items", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  productId: integer("product_id").notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  qty: doublePrecision("qty").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  costPrice: doublePrecision("cost_price").notNull().default(0),
  taxPercent: doublePrecision("tax_percent").notNull().default(0),
  lineTotal: doublePrecision("line_total").notNull(),
});

export const cashMoves = pgTable("cash_moves", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  treasuryId: integer("treasury_id").notNull(),
  direction: text("direction").notNull(),
  amount: doublePrecision("amount").notNull(),
  source: text("source").notNull(),
  partyName: text("party_name"),
  notes: text("notes"),
  refId: integer("ref_id"),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  category: text("category").notNull(),
  amount: doublePrecision("amount").notNull(),
  treasuryId: integer("treasury_id").notNull(),
  notes: text("notes"),
  employeeId: integer("employee_id"),
});

export const attendance = pgTable(
  "attendance",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id").notNull(),
    day: text("day").notNull(),
    checkIn: text("check_in"),
    checkOut: text("check_out"),
    status: text("status").notNull().default("حاضر"),
  },
  (table) => [uniqueIndex("attendance_emp_day_idx").on(table.employeeId, table.day)],
);

export const transfers = pgTable("transfers", {
  id: serial("id").primaryKey(),
  number: integer("number").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  fromWarehouseId: integer("from_warehouse_id").notNull(),
  toWarehouseId: integer("to_warehouse_id").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("saved"),
});

export const transferItems = pgTable("transfer_items", {
  id: serial("id").primaryKey(),
  transferId: integer("transfer_id").notNull(),
  productId: integer("product_id").notNull(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  qty: doublePrecision("qty").notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  name: text("name").notNull(),
  phone: text("phone"),
  body: text("body").notNull(),
});

export const shiftCloses = pgTable("shift_closes", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  treasuryId: integer("treasury_id").notNull(),
  systemBalance: doublePrecision("system_balance").notNull(),
  counted: doublePrecision("counted").notNull(),
  difference: doublePrecision("difference").notNull(),
  notes: text("notes"),
  cashier: text("cashier").notNull().default("admin"),
});

export const stockMoves = pgTable("stock_moves", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  productId: integer("product_id").notNull(),
  warehouseId: integer("warehouse_id").notNull(),
  qtyDelta: doublePrecision("qty_delta").notNull(),
  source: text("source").notNull(),
  notes: text("notes"),
  refId: integer("ref_id"),
});
