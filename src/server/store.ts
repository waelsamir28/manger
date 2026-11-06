import { and, desc, eq, inArray, sql, type ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import { pool, db } from "@/db";
import * as schema from "@/db/schema";
import {
  attendance,
  cashMoves,
  categories,
  customers,
  documentItems,
  documents,
  employees,
  expenses,
  installmentDues,
  installmentPlans,
  messages,
  products,
  settings,
  shiftCloses,
  stockMoves,
  stocks,
  suppliers,
  transferItems,
  transfers,
  treasuries,
  warehouses,
} from "@/db/schema";
import { calcDocument } from "@/lib/calc";
import { cairoDay, r2 } from "@/lib/format";
import type { BootstrapData, DocInput, LineInput } from "@/lib/types";

const TABLE_SQL = [
  `CREATE TABLE IF NOT EXISTS settings (
    id serial PRIMARY KEY,
    store_name text NOT NULL,
    activity text NOT NULL,
    phone text NOT NULL,
    phone2 text,
    website text,
    email text,
    address text,
    tax_percent double precision NOT NULL DEFAULT 0,
    allow_negative boolean NOT NULL DEFAULT false,
    auto_fill_paid boolean NOT NULL DEFAULT true,
    footer_note text,
    cashier_name text NOT NULL DEFAULT 'admin'
  )`,
  `CREATE TABLE IF NOT EXISTS warehouses (
    id serial PRIMARY KEY,
    name text NOT NULL,
    is_default boolean NOT NULL DEFAULT false,
    notes text
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id serial PRIMARY KEY,
    name text NOT NULL,
    color text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    kind text NOT NULL DEFAULT 'stationery'
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id serial PRIMARY KEY,
    code text NOT NULL,
    name text NOT NULL,
    category_id integer NOT NULL,
    unit text NOT NULL DEFAULT 'قطعة',
    cost_price double precision NOT NULL DEFAULT 0,
    sale_price double precision NOT NULL DEFAULT 0,
    wholesale_price double precision NOT NULL DEFAULT 0,
    tax_percent double precision NOT NULL DEFAULT 0,
    min_stock integer NOT NULL DEFAULT 5,
    grade text,
    subject text,
    stage text,
    publisher text,
    active boolean NOT NULL DEFAULT true
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS products_code_idx ON products (code)`,
  `CREATE TABLE IF NOT EXISTS stocks (
    id serial PRIMARY KEY,
    product_id integer NOT NULL,
    warehouse_id integer NOT NULL,
    qty double precision NOT NULL DEFAULT 0
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS stocks_product_wh_idx ON stocks (product_id, warehouse_id)`,
  `CREATE TABLE IF NOT EXISTS customers (
    id serial PRIMARY KEY,
    code text NOT NULL,
    name text NOT NULL,
    phone text,
    address text,
    balance double precision NOT NULL DEFAULT 0,
    price_type text NOT NULL DEFAULT 'قطاعي',
    is_system boolean NOT NULL DEFAULT false,
    notes text
  )`,
  `CREATE TABLE IF NOT EXISTS suppliers (
    id serial PRIMARY KEY,
    code text NOT NULL,
    name text NOT NULL,
    phone text,
    address text,
    balance double precision NOT NULL DEFAULT 0,
    notes text
  )`,
  `CREATE TABLE IF NOT EXISTS employees (
    id serial PRIMARY KEY,
    code text NOT NULL,
    name text NOT NULL,
    job_title text NOT NULL,
    phone text,
    salary double precision NOT NULL DEFAULT 0,
    hire_date text,
    active boolean NOT NULL DEFAULT true
  )`,
  `CREATE TABLE IF NOT EXISTS treasuries (
    id serial PRIMARY KEY,
    name text NOT NULL,
    balance double precision NOT NULL DEFAULT 0,
    kind text NOT NULL DEFAULT 'cash'
  )`,
  `CREATE TABLE IF NOT EXISTS documents (
    id serial PRIMARY KEY,
    doc_type text NOT NULL,
    number integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    party_id integer,
    party_name text NOT NULL,
    warehouse_id integer NOT NULL,
    treasury_id integer,
    payment_type text NOT NULL,
    price_type text NOT NULL,
    discount_percent double precision NOT NULL DEFAULT 0,
    discount_amount double precision NOT NULL DEFAULT 0,
    tax_amount double precision NOT NULL DEFAULT 0,
    delivery_fee double precision NOT NULL DEFAULT 0,
    subtotal double precision NOT NULL DEFAULT 0,
    total double precision NOT NULL DEFAULT 0,
    paid double precision NOT NULL DEFAULT 0,
    change_amount double precision NOT NULL DEFAULT 0,
    previous_balance double precision NOT NULL DEFAULT 0,
    notes text,
    status text NOT NULL DEFAULT 'saved',
    cashier text NOT NULL DEFAULT 'admin',
    source_invoice_id integer
  )`,
  `CREATE TABLE IF NOT EXISTS document_items (
    id serial PRIMARY KEY,
    document_id integer NOT NULL,
    product_id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    unit text NOT NULL,
    qty double precision NOT NULL,
    unit_price double precision NOT NULL,
    cost_price double precision NOT NULL DEFAULT 0,
    tax_percent double precision NOT NULL DEFAULT 0,
    line_total double precision NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS cash_moves (
    id serial PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    treasury_id integer NOT NULL,
    direction text NOT NULL,
    amount double precision NOT NULL,
    source text NOT NULL,
    party_name text,
    notes text,
    ref_id integer
  )`,
  `CREATE TABLE IF NOT EXISTS expenses (
    id serial PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    category text NOT NULL,
    amount double precision NOT NULL,
    treasury_id integer NOT NULL,
    notes text,
    employee_id integer
  )`,
  `CREATE TABLE IF NOT EXISTS attendance (
    id serial PRIMARY KEY,
    employee_id integer NOT NULL,
    day text NOT NULL,
    check_in text,
    check_out text,
    status text NOT NULL DEFAULT 'حاضر'
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS attendance_emp_day_idx ON attendance (employee_id, day)`,
  `CREATE TABLE IF NOT EXISTS transfers (
    id serial PRIMARY KEY,
    number integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    from_warehouse_id integer NOT NULL,
    to_warehouse_id integer NOT NULL,
    notes text,
    status text NOT NULL DEFAULT 'saved'
  )`,
  `CREATE TABLE IF NOT EXISTS transfer_items (
    id serial PRIMARY KEY,
    transfer_id integer NOT NULL,
    product_id integer NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    qty double precision NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id serial PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    name text NOT NULL,
    phone text,
    body text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS shift_closes (
    id serial PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    treasury_id integer NOT NULL,
    system_balance double precision NOT NULL,
    counted double precision NOT NULL,
    difference double precision NOT NULL,
    notes text,
    cashier text NOT NULL DEFAULT 'admin'
  )`,
  `CREATE TABLE IF NOT EXISTS stock_moves (
    id serial PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    product_id integer NOT NULL,
    warehouse_id integer NOT NULL,
    qty_delta double precision NOT NULL,
    source text NOT NULL,
    notes text,
    ref_id integer
  )`,
  `CREATE TABLE IF NOT EXISTS installment_plans (
    id serial PRIMARY KEY,
    number integer NOT NULL,
    customer_id integer NOT NULL,
    customer_name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    total double precision NOT NULL,
    down_payment double precision NOT NULL DEFAULT 0,
    months integer NOT NULL,
    monthly_amount double precision NOT NULL,
    paid_amount double precision NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'جاري',
    notes text,
    treasury_id integer
  )`,
  `CREATE TABLE IF NOT EXISTS installment_dues (
    id serial PRIMARY KEY,
    plan_id integer NOT NULL,
    due_no integer NOT NULL,
    due_date text NOT NULL,
    amount double precision NOT NULL,
    paid double precision NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'مستحق'
  )`,
];

const ALTER_SQL = [
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'ج.م'`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS season text NOT NULL DEFAULT '2026-2027'`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS installment_months integer NOT NULL DEFAULT 4`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS down_percent double precision NOT NULL DEFAULT 25`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS late_fee double precision NOT NULL DEFAULT 0`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS return_days integer NOT NULL DEFAULT 7`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS book_return_days integer NOT NULL DEFAULT 3`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_payment text NOT NULL DEFAULT 'نقدي'`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'classic'`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS login_user text NOT NULL DEFAULT 'admin'`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS login_pin text NOT NULL DEFAULT '1234'`,
  `UPDATE settings SET footer_note = 'يُرجى الاحتفاظ بالفاتورة. الكتب والكراسات والأقلام للبيع فقط.' WHERE footer_note LIKE '%تُستبدل%' OR footer_note LIKE '%استبدال%'`,
];

let tablesReady = false;

async function ensureTables() {
  if (tablesReady) return;
  for (const statement of TABLE_SQL) {
    await pool.query(statement);
  }
  for (const statement of ALTER_SQL) {
    await pool.query(statement);
  }
  tablesReady = true;
}

function num(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function str(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function iso(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString();
}

type Tx = PgTransaction<NodePgQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

function cairoTime() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function daysAgoDate(days: number, hour: number) {
  const now = new Date();
  const cairoWall = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
  const utcWall = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
  const offset = cairoWall.getTime() - utcWall.getTime();
  cairoWall.setDate(cairoWall.getDate() - days);
  cairoWall.setHours(hour, 20, 0, 0);
  return new Date(cairoWall.getTime() - offset);
}

const NUMBER_FLOOR: Record<string, number> = {
  sale: 4000,
  purchase: 2000,
  saleReturn: 3000,
  purchaseReturn: 3500,
  transfer: 5000,
};

function moneyEffects(paymentType: string, total: number, paid: number) {
  const tendered = r2(Math.max(0, paid));
  const gross = r2(Math.max(0, total));
  const cashLike = paymentType === "نقدي" || paymentType === "فيزا";
  const cashKept = r2(cashLike ? Math.min(tendered, gross) : tendered);
  const balanceDelta = r2(cashLike ? Math.max(0, gross - tendered) : gross - tendered);
  const change = r2(cashLike ? Math.max(0, tendered - gross) : 0);
  return { cashKept, balanceDelta, change };
}

async function nextNumber(tx: Tx, docType: string) {
  const [row] = await tx
    .select({ n: sql<number>`coalesce(max(${documents.number}), 0)` })
    .from(documents)
    .where(eq(documents.docType, docType));
  return Math.max(NUMBER_FLOOR[docType] ?? 1000, Number(row?.n || 0)) + 1;
}

async function readStock(tx: Tx, productId: number, warehouseId: number) {
  const [row] = await tx
    .select()
    .from(stocks)
    .where(and(eq(stocks.productId, productId), eq(stocks.warehouseId, warehouseId)));
  return row ?? null;
}

async function changeStock(
  tx: Tx,
  productId: number,
  warehouseId: number,
  delta: number,
  source: string,
  notes: string,
  allowNegative: boolean,
  productName: string,
  refId?: number,
) {
  const amount = r2(delta);
  if (Math.abs(amount) < 0.0001) return;
  let row = await readStock(tx, productId, warehouseId);
  if (!row) {
    const [created] = await tx.insert(stocks).values({ productId, warehouseId, qty: 0 }).returning();
    row = created;
  }
  const next = r2(Number(row.qty) + amount);
  if (next < -0.001 && !allowNegative) {
    throw new Error(`الكمية غير متوفرة في المخزن: ${productName}`);
  }
  await tx.update(stocks).set({ qty: next }).where(eq(stocks.id, row.id));
  await tx.insert(stockMoves).values({
    productId,
    warehouseId,
    qtyDelta: amount,
    source,
    notes,
    refId: refId ?? null,
  });
}

async function changeTreasury(
  tx: Tx,
  treasuryId: number,
  delta: number,
  source: string,
  partyName: string | null,
  notes: string | null,
  refId?: number,
) {
  const amount = r2(delta);
  if (Math.abs(amount) < 0.001) return;
  const [row] = await tx.select().from(treasuries).where(eq(treasuries.id, treasuryId));
  if (!row) throw new Error("الخزينة غير موجودة");
  const next = r2(Number(row.balance) + amount);
  if (next < -0.009) throw new Error("رصيد الخزينة لا يكفي");
  await tx.update(treasuries).set({ balance: next }).where(eq(treasuries.id, treasuryId));
  await tx.insert(cashMoves).values({
    treasuryId,
    direction: amount >= 0 ? "in" : "out",
    amount: Math.abs(amount),
    source,
    partyName,
    notes,
    refId: refId ?? null,
  });
}

async function changePartyBalance(tx: Tx, kind: "customer" | "supplier", partyId: number | null, delta: number) {
  const amount = r2(delta);
  if (!partyId || Math.abs(amount) < 0.001) return;
  if (kind === "customer") {
    const [row] = await tx.select().from(customers).where(eq(customers.id, partyId));
    if (!row) return;
    await tx.update(customers).set({ balance: r2(Number(row.balance) + amount) }).where(eq(customers.id, partyId));
  } else {
    const [row] = await tx.select().from(suppliers).where(eq(suppliers.id, partyId));
    if (!row) return;
    await tx.update(suppliers).set({ balance: r2(Number(row.balance) + amount) }).where(eq(suppliers.id, partyId));
  }
}

function stockSign(docType: string) {
  if (docType === "sale" || docType === "purchaseReturn") return -1;
  return 1;
}

function cashSign(docType: string) {
  if (docType === "sale" || docType === "purchaseReturn") return 1;
  return -1;
}

function partyKind(docType: string): "customer" | "supplier" {
  return docType === "sale" || docType === "saleReturn" ? "customer" : "supplier";
}

type EffectLine = { productId: number; name: string; qty: number };

async function applyEffects(
  tx: Tx,
  input: {
    docType: string;
    docId: number;
    lines: EffectLine[];
    warehouseId: number;
    treasuryId: number | null;
    partyId: number | null;
    partyName: string;
    paymentType: string;
    total: number;
    paid: number;
    allowNegative: boolean;
    reverse?: boolean;
    number: number;
  },
) {
  const flip = input.reverse ? -1 : 1;
  const effects = moneyEffects(input.paymentType, input.total, input.paid);
  for (const line of input.lines) {
    await changeStock(
      tx,
      line.productId,
      input.warehouseId,
      flip * stockSign(input.docType) * Number(line.qty),
      input.reverse ? "void" : input.docType,
      `${input.reverse ? "إلغاء" : "ترحيل"} ${input.docType} #${input.number}`,
      input.reverse ? true : input.allowNegative,
      line.name,
      input.docId,
    );
  }
  if (input.treasuryId) {
    await changeTreasury(
      tx,
      input.treasuryId,
      flip * cashSign(input.docType) * effects.cashKept,
      input.reverse ? "void" : input.docType,
      input.partyName,
      `${input.reverse ? "إلغاء فاتورة" : "فاتورة"} #${input.number}`,
      input.docId,
    );
  }
  await changePartyBalance(
    tx,
    partyKind(input.docType),
    input.partyId,
    flip * (input.docType === "sale" || input.docType === "purchase" ? 1 : -1) * effects.balanceDelta,
  );
}

async function loadProductMap(tx: Tx) {
  const rows = await tx.select().from(products);
  return new Map(rows.map((row) => [row.id, row]));
}

async function persistDocument(
  tx: Tx,
  input: DocInput,
  opts: { allowNegative: boolean; cashier: string; createdAt?: Date },
) {
  if (!input.lines.length) throw new Error("أضف صنفاً واحداً على الأقل");
  if (!input.warehouseId) throw new Error("اختر المخزن");
  if (!input.treasuryId) throw new Error("اختر الخزينة");

  let existing: typeof documents.$inferSelect | null = null;
  if (input.id) {
    const [doc] = await tx.select().from(documents).where(eq(documents.id, input.id));
    if (!doc) throw new Error("الفاتورة غير موجودة");
    if (doc.status === "void") throw new Error("الفاتورة ملغاة");
    if (doc.status === "saved") throw new Error("الفاتورة محفوظة. يمكن إلغاؤها أو عمل مرتجع");
    existing = doc;
  }

  const productMap = await loadProductMap(tx);
  const lines = input.lines.map((line) => {
    const product = productMap.get(Number(line.productId));
    if (!product || !product.active) throw new Error("أحد الأصناف غير متاح");
    const qty = r2(num(line.qty));
    const unitPrice = r2(num(line.unitPrice));
    if (qty <= 0) throw new Error(`الكمية غير صحيحة: ${product.name}`);
    if (unitPrice < 0) throw new Error(`السعر غير صحيح: ${product.name}`);
    return {
      product,
      qty,
      unitPrice,
      taxPercent: r2(num(line.taxPercent)),
      lineTotal: r2(qty * unitPrice),
    };
  });

  if ((input.docType === "saleReturn" || input.docType === "purchaseReturn") && input.sourceInvoiceId) {
    const sourceItems = await tx
      .select()
      .from(documentItems)
      .where(eq(documentItems.documentId, input.sourceInvoiceId));
    const previous = await tx
      .select()
      .from(documents)
      .where(and(eq(documents.sourceInvoiceId, input.sourceInvoiceId), eq(documents.status, "saved")));
    const previousIds = previous.map((row: { id: number }) => row.id);
    const previousItems = previousIds.length
      ? await tx.select().from(documentItems).where(inArray(documentItems.documentId, previousIds))
      : [];
    for (const line of lines) {
      const sold = sourceItems
        .filter((item: { productId: number; qty: number }) => item.productId === line.product.id)
        .reduce((sum: number, item: { qty: number }) => sum + Number(item.qty), 0);
      const returned = previousItems
        .filter((item: { productId: number }) => item.productId === line.product.id)
        .reduce((sum: number, item: { qty: number }) => sum + Number(item.qty), 0);
      if (line.qty - (sold - returned) > 0.001) {
        throw new Error(`كمية المرتجع أكبر من الفاتورة الأصلية: ${line.product.name}`);
      }
    }
  }

  const totals = calcDocument({
    lines: lines.map((line) => ({ qty: line.qty, unitPrice: line.unitPrice, taxPercent: line.taxPercent })),
    discountPercent: num(input.discountAmount) > 0 ? 0 : num(input.discountPercent),
    discountAmount: num(input.discountAmount),
    deliveryFee: num(input.deliveryFee),
    globalTaxPercent: num(input.taxPercent),
    paid: num(input.paid),
  });
  const effects = moneyEffects(input.paymentType, totals.total, totals.paid);

  const saleSide = input.docType === "sale" || input.docType === "saleReturn";
  let partyId = input.partyId;
  let partyName = saleSide ? "عميل نقدي" : "";
  let previousBalance = 0;
  if (saleSide) {
    if (!partyId) {
      const [cashCustomer] = await tx.select().from(customers).where(eq(customers.isSystem, true)).limit(1);
      partyId = cashCustomer?.id ?? null;
      partyName = cashCustomer?.name ?? "عميل نقدي";
      previousBalance = Number(cashCustomer?.balance || 0);
    } else {
      const [customer] = await tx.select().from(customers).where(eq(customers.id, partyId));
      if (!customer) throw new Error("العميل غير موجود");
      partyName = customer.name;
      previousBalance = Number(customer.balance);
    }
  } else {
    if (!partyId) throw new Error("اختر المورد");
    const [supplier] = await tx.select().from(suppliers).where(eq(suppliers.id, partyId));
    if (!supplier) throw new Error("المورد غير موجود");
    partyName = supplier.name;
    previousBalance = Number(supplier.balance);
  }

  const status = input.suspend ? "suspended" : "saved";
  const number = existing?.number ?? (await nextNumber(tx, input.docType));
  const values = {
    docType: input.docType,
    number,
    partyId: partyId ?? null,
    partyName,
    warehouseId: input.warehouseId,
    treasuryId: input.treasuryId,
    paymentType: input.paymentType || "نقدي",
    priceType: input.priceType || "قطاعي",
    discountPercent: num(input.discountAmount) > 0 ? 0 : r2(num(input.discountPercent)),
    discountAmount: totals.discount,
    taxAmount: totals.tax,
    deliveryFee: totals.delivery,
    subtotal: totals.subtotal,
    total: totals.total,
    paid: r2(num(input.paid)),
    changeAmount: effects.change,
    previousBalance,
    notes: str(input.notes) || null,
    status,
    cashier: opts.cashier || "admin",
    sourceInvoiceId: input.sourceInvoiceId ?? null,
    ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
  };

  let docId = existing?.id ?? 0;
  if (existing) {
    await tx.update(documents).set(values).where(eq(documents.id, existing.id));
    await tx.delete(documentItems).where(eq(documentItems.documentId, existing.id));
  } else {
    const [created] = await tx.insert(documents).values(values).returning();
    docId = created.id;
  }

  await tx.insert(documentItems).values(
    lines.map((line) => ({
      documentId: docId,
      productId: line.product.id,
      code: line.product.code,
      name: line.product.name,
      unit: line.product.unit,
      qty: line.qty,
      unitPrice: line.unitPrice,
      costPrice: line.product.costPrice,
      taxPercent: line.taxPercent,
      lineTotal: line.lineTotal,
    })),
  );

  if (status === "saved") {
    await applyEffects(tx, {
      docType: input.docType,
      docId,
      lines: lines.map((line) => ({ productId: line.product.id, name: line.product.name, qty: line.qty })),
      warehouseId: input.warehouseId,
      treasuryId: input.treasuryId,
      partyId: partyId ?? null,
      partyName,
      paymentType: values.paymentType,
      total: totals.total,
      paid: values.paid,
      allowNegative: opts.allowNegative,
      number,
    });
  }

  const [document] = await tx.select().from(documents).where(eq(documents.id, docId));
  const items = await tx.select().from(documentItems).where(eq(documentItems.documentId, docId));
  return { document, items };
}

async function ensureSeeded() {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(742215)`);
    const existing = await tx.select().from(settings).limit(1);
    if (existing.length) return;

    await tx.insert(settings).values({
      storeName: "قرطاسية ومكتبة النور",
      activity: "أدوات مدرسية · مستلزمات مكتبية · كتب خارجية",
      phone: "010 55 200 314",
      phone2: "02 2575 4410",
      website: "www.alnoor-stationery.com",
      email: "sales@alnoor-stationery.com",
      address: "١٢ شارع المدرسة، وسط البلد، القاهرة",
      taxPercent: 0,
      allowNegative: false,
      autoFillPaid: true,
      footerNote: "يُرجى الاحتفاظ بالفاتورة. الكتب والكراسات والأقلام للبيع فقط.",
      cashierName: "admin",
    });

    const [shop, store, bookStore] = await tx
      .insert(warehouses)
      .values([
        { name: "المعرض", isDefault: true, notes: "قاعة البيع" },
        { name: "المخزن الرئيسي", isDefault: false, notes: "احتياطي القرطاسية" },
        { name: "مخزن الكتب", isDefault: false, notes: "الكتب الخارجية" },
      ])
      .returning();

    const categoryRows = await tx
      .insert(categories)
      .values([
        { name: "كتابة", color: "#3b82f6", sortOrder: 1, kind: "stationery" },
        { name: "كراسات", color: "#f59e0b", sortOrder: 2, kind: "stationery" },
        { name: "هندسة", color: "#10b981", sortOrder: 3, kind: "stationery" },
        { name: "ألوان", color: "#ec4899", sortOrder: 4, kind: "stationery" },
        { name: "ورق وملفات", color: "#6366f1", sortOrder: 5, kind: "stationery" },
        { name: "حقائب", color: "#f97316", sortOrder: 6, kind: "stationery" },
        { name: "مكتبي", color: "#14b8a6", sortOrder: 7, kind: "office" },
        { name: "كتب خارجية", color: "#8b5cf6", sortOrder: 8, kind: "book" },
      ])
      .returning();
    const cat = Object.fromEntries(categoryRows.map((row) => [row.name, row.id]));

    const stationery: {
      code: string;
      name: string;
      cat: string;
      sale: number;
      unit?: string;
      min?: number;
      qty?: number;
    }[] = [
      { code: "1001", name: "قلم جاف أزرق", cat: "كتابة", sale: 5 },
      { code: "1002", name: "قلم جاف أسود", cat: "كتابة", sale: 5 },
      { code: "1003", name: "قلم جاف أحمر", cat: "كتابة", sale: 5 },
      { code: "1004", name: "قلم جاف أخضر", cat: "كتابة", sale: 5 },
      { code: "1005", name: "قلم رصاص HB", cat: "كتابة", sale: 3 },
      { code: "1006", name: "قلم جاف جل", cat: "كتابة", sale: 8 },
      { code: "1007", name: "ماركر سبورة أسود", cat: "كتابة", sale: 12, min: 10, qty: 4 },
      { code: "1008", name: "ماركر سبورة أحمر", cat: "كتابة", sale: 12 },
      { code: "1009", name: "قلم حبر سائل", cat: "كتابة", sale: 25 },
      { code: "1010", name: "طقم أقلام 12 لون", cat: "كتابة", sale: 35, unit: "مجموعة" },
      { code: "1011", name: "قلم تخطيط أسود", cat: "كتابة", sale: 7 },
      { code: "1012", name: "قلم سبورة أبيض", cat: "كتابة", sale: 14 },
      { code: "1101", name: "كراسة 40 ورقة", cat: "كراسات", sale: 8 },
      { code: "1102", name: "كراسة 60 ورقة", cat: "كراسات", sale: 12 },
      { code: "1103", name: "كراسة 80 ورقة", cat: "كراسات", sale: 16 },
      { code: "1104", name: "كراسة 100 ورقة", cat: "كراسات", sale: 22 },
      { code: "1105", name: "دفتر رسم", cat: "كراسات", sale: 40 },
      { code: "1106", name: "كشكول جامعي", cat: "كراسات", sale: 28 },
      { code: "1107", name: "دفتر واجب", cat: "كراسات", sale: 10 },
      { code: "1108", name: "نوتة A5", cat: "كراسات", sale: 30 },
      { code: "1109", name: "كراسة تسليم", cat: "كراسات", sale: 18 },
      { code: "1110", name: "كشكول A4", cat: "كراسات", sale: 35 },
      { code: "1201", name: "مسطرة 20 سم", cat: "هندسة", sale: 5 },
      { code: "1202", name: "مسطرة 30 سم", cat: "هندسة", sale: 8 },
      { code: "1203", name: "برجل معدن", cat: "هندسة", sale: 22 },
      { code: "1204", name: "منقلة", cat: "هندسة", sale: 6 },
      { code: "1205", name: "مثلث رسم", cat: "هندسة", sale: 7 },
      { code: "1206", name: "ممحاة", cat: "هندسة", sale: 3, min: 12, qty: 5 },
      { code: "1207", name: "براية معدن", cat: "هندسة", sale: 4 },
      { code: "1208", name: "طقم هندسة", cat: "هندسة", sale: 35, unit: "مجموعة" },
      { code: "1301", name: "ألوان خشب 12", cat: "ألوان", sale: 25, unit: "علبة" },
      { code: "1302", name: "ألوان خشب 24", cat: "ألوان", sale: 48, unit: "علبة" },
      { code: "1303", name: "فلوماستر 12", cat: "ألوان", sale: 32, unit: "علبة" },
      { code: "1304", name: "ألوان مائية", cat: "ألوان", sale: 42, unit: "علبة" },
      { code: "1305", name: "شمع تلوين", cat: "ألوان", sale: 18, unit: "علبة" },
      { code: "1306", name: "ألوان سبورة", cat: "ألوان", sale: 15, unit: "علبة" },
      { code: "1307", name: "فرش رسم", cat: "ألوان", sale: 20, unit: "مجموعة" },
      { code: "1308", name: "لوحة رسم", cat: "ألوان", sale: 12 },
      { code: "1401", name: "ورق A4 500 ورقة", cat: "ورق وملفات", sale: 165, unit: "رزمة", min: 8, qty: 6 },
      { code: "1402", name: "ورق A5", cat: "ورق وملفات", sale: 45, unit: "رزمة" },
      { code: "1403", name: "ملف بلاستيك", cat: "ورق وملفات", sale: 8 },
      { code: "1404", name: "دوسيه كرتون", cat: "ورق وملفات", sale: 12 },
      { code: "1405", name: "أظرف C5", cat: "ورق وملفات", sale: 15, unit: "باكت" },
      { code: "1406", name: "ورق مقوى ملون", cat: "ورق وملفات", sale: 20, unit: "مجموعة" },
      { code: "1407", name: "ورق لاصق", cat: "ورق وملفات", sale: 18 },
      { code: "1408", name: "فواصل ملونة", cat: "ورق وملفات", sale: 10, unit: "مجموعة" },
      { code: "1501", name: "حقيبة ظهر ابتدائي", cat: "حقائب", sale: 280, min: 4, qty: 10 },
      { code: "1502", name: "حقيبة إعدادي", cat: "حقائب", sale: 350, min: 4, qty: 8 },
      { code: "1503", name: "مقلمة قماش", cat: "حقائب", sale: 35 },
      { code: "1504", name: "مقلمة علبة", cat: "حقائب", sale: 55 },
      { code: "1505", name: "لانش بوكس", cat: "حقائب", sale: 70 },
      { code: "1506", name: "زمزمية", cat: "حقائب", sale: 40 },
      { code: "1507", name: "مقلمة شفافة", cat: "حقائب", sale: 25 },
      { code: "1508", name: "حقيبة لابتوب", cat: "حقائب", sale: 420, min: 2, qty: 5 },
      { code: "1601", name: "دباسة وسط", cat: "مكتبي", sale: 32 },
      { code: "1602", name: "دبابيس علبة", cat: "مكتبي", sale: 8, unit: "علبة" },
      { code: "1603", name: "مشابك ورق", cat: "مكتبي", sale: 10, unit: "علبة" },
      { code: "1604", name: "مقص", cat: "مكتبي", sale: 15 },
      { code: "1605", name: "لاصق سائل", cat: "مكتبي", sale: 7 },
      { code: "1606", name: "شريط لاصق", cat: "مكتبي", sale: 6 },
      { code: "1607", name: "آلة حاسبة", cat: "مكتبي", sale: 65 },
      { code: "1608", name: "خرامة", cat: "مكتبي", sale: 40 },
    ];

    const grades = [
      { grade: "أولى ابتدائي", stage: "ابتدائي", price: 72 },
      { grade: "ثالثة ابتدائي", stage: "ابتدائي", price: 82 },
      { grade: "خامسة ابتدائي", stage: "ابتدائي", price: 88 },
      { grade: "أولى إعدادي", stage: "إعدادي", price: 105 },
      { grade: "ثالثة إعدادي", stage: "إعدادي", price: 118 },
      { grade: "أولى ثانوي", stage: "ثانوي", price: 145 },
      { grade: "ثالثة ثانوي", stage: "ثانوي", price: 170 },
    ];
    const subjects = ["عربي", "رياضيات", "إنجليزي", "علوم"];
    const bookRows = grades.flatMap((grade, gradeIndex) =>
      subjects.map((subject, subjectIndex) => ({
        code: String(8001 + gradeIndex * 10 + subjectIndex),
        name: `كتاب خارجي ${subject} — ${grade.grade}`,
        cat: "كتب خارجية",
        sale: grade.price + (subject === "رياضيات" ? 8 : 0),
        unit: "كتاب",
        min: 4,
        qty: 40,
        grade: grade.grade,
        subject,
        stage: grade.stage,
        publisher: "سلسلة خارجية",
        margin: 0.8,
      })),
    );

    const productInputs = [
      ...stationery.map((item) => ({ ...item, grade: null, subject: null, stage: null, publisher: null, margin: 0.66 })),
      ...bookRows,
    ];

    const insertedProducts = await tx
      .insert(products)
      .values(
        productInputs.map((item) => ({
          code: item.code,
          name: item.name,
          categoryId: cat[item.cat],
          unit: item.unit || "قطعة",
          costPrice: r2(item.sale * (item.margin || 0.66)),
          salePrice: item.sale,
          wholesalePrice: r2(item.sale * 0.9),
          taxPercent: 0,
          minStock: item.min ?? (item.cat === "كتب خارجية" ? 4 : 8),
          grade: item.grade,
          subject: item.subject,
          stage: item.stage,
          publisher: item.publisher,
          active: true,
        })),
      )
      .returning();

    const byCode = Object.fromEntries(insertedProducts.map((row) => [row.code, row]));
    const whIds = [shop.id, store.id, bookStore.id];
    await tx.insert(stocks).values(
      insertedProducts.flatMap((product) => {
        const base = productInputs.find((item) => item.code === product.code)?.qty ?? 48;
        const isBook = product.stage != null;
        return whIds.map((warehouseId) => {
          let qty = 0;
          if (warehouseId === shop.id) qty = isBook ? Math.ceil(base * 0.55) : Math.ceil(base * 0.7);
          else if (warehouseId === store.id) qty = isBook ? 0 : Math.ceil(base * 0.3);
          else qty = isBook ? Math.floor(base * 0.45) : 0;
          return { productId: product.id, warehouseId, qty };
        });
      }),
    );
    await tx.insert(stockMoves).values(
      insertedProducts.flatMap((product) => {
        const base = productInputs.find((item) => item.code === product.code)?.qty ?? 48;
        const isBook = product.stage != null;
        return whIds
          .map((warehouseId) => {
            let qty = 0;
            if (warehouseId === shop.id) qty = isBook ? Math.ceil(base * 0.55) : Math.ceil(base * 0.7);
            else if (warehouseId === store.id) qty = isBook ? 0 : Math.ceil(base * 0.3);
            else qty = isBook ? Math.floor(base * 0.45) : 0;
            return qty
              ? { productId: product.id, warehouseId, qtyDelta: qty, source: "opening", notes: "رصيد افتتاحي", refId: null }
              : null;
          })
          .filter((row): row is NonNullable<typeof row> => Boolean(row));
      }),
    );

    await tx.insert(customers).values([
      { code: "C-000", name: "عميل نقدي", phone: "", address: "المحل", balance: 0, priceType: "قطاعي", isSystem: true, notes: "العميل الافتراضي للكاشير" },
      { code: "C-001", name: "مدرسة النور الابتدائية", phone: "01022001133", address: "مدينة نصر", balance: 0, priceType: "جملة", isSystem: false, notes: "حساب شهري — تسليم للمدرسة" },
      { code: "C-002", name: "معهد الأمل", phone: "01144002255", address: "فيصل", balance: 0, priceType: "جملة", isSystem: false, notes: "" },
      { code: "C-003", name: "أحمد محمود", phone: "01005551234", address: "المعادي", balance: 0, priceType: "قطاعي", isSystem: false, notes: "" },
      { code: "C-004", name: "سارة علي — ولي أمر", phone: "01223334455", address: "الهرم", balance: 0, priceType: "قطاعي", isSystem: false, notes: "" },
      { code: "C-005", name: "شركة النيل للمكاتب", phone: "0225558899", address: "وسط البلد", balance: 0, priceType: "جملة", isSystem: false, notes: "مستلزمات مكتبية" },
      { code: "C-006", name: "مكتبة الجامعة", phone: "01099887766", address: "الجيزة", balance: 0, priceType: "جملة", isSystem: false, notes: "" },
      { code: "C-007", name: "ياسمين فؤاد", phone: "01112223344", address: "مدينة نصر", balance: 0, priceType: "قطاعي", isSystem: false, notes: "" },
    ]);
    await tx.insert(suppliers).values([
      { code: "S-001", name: "شركة أقلام مصر", phone: "01030001122", address: "العبور", balance: 0, notes: "أقلام وأدوات كتابة" },
      { code: "S-002", name: "مطبعة الكتب الخارجية", phone: "01030002233", address: "بولاق", balance: 0, notes: "كتب خارجية" },
      { code: "S-003", name: "الورق الوطني", phone: "01030003344", address: "6 أكتوبر", balance: 0, notes: "ورق ورزَم" },
      { code: "S-004", name: "مصنع الحقائب الحديثة", phone: "01030004455", address: "العاشر من رمضان", balance: 0, notes: "" },
      { code: "S-005", name: "مستلزمات المكتب الذهبي", phone: "01030005566", address: "الإسكندرية", balance: 0, notes: "" },
    ]);
    await tx.insert(employees).values([
      { code: "E-001", name: "محمد حسن", jobTitle: "كاشير", phone: "01011110001", salary: 6500, hireDate: "2023-09-01", active: true },
      { code: "E-002", name: "منى عادل", jobTitle: "مبيعات", phone: "01011110002", salary: 6000, hireDate: "2024-02-15", active: true },
      { code: "E-003", name: "كريم فؤاد", jobTitle: "أمين مخزن", phone: "01011110003", salary: 5800, hireDate: "2022-11-01", active: true },
      { code: "E-004", name: "هدى سامي", jobTitle: "محاسبة", phone: "01011110004", salary: 8000, hireDate: "2021-06-01", active: true },
    ]);
    const [cashBox, bank] = await tx
      .insert(treasuries)
      .values([
        { name: "الخزينة الرئيسية", balance: 18500, kind: "cash" },
        { name: "حساب البنك", balance: 6200, kind: "bank" },
      ])
      .returning();
    await tx.insert(cashMoves).values([
      { treasuryId: cashBox.id, direction: "in", amount: 18500, source: "opening", partyName: "رصيد افتتاحي", notes: "افتتاح الخزينة", refId: null },
      { treasuryId: bank.id, direction: "in", amount: 6200, source: "opening", partyName: "رصيد افتتاحي", notes: "افتتاح البنك", refId: null },
    ]);

    const customerByCode = Object.fromEntries((await tx.select().from(customers)).map((row) => [row.code, row]));
    const supplierByCode = Object.fromEntries((await tx.select().from(suppliers)).map((row) => [row.code, row]));
    const settingsRow = (await tx.select().from(settings))[0];

    const sell = async (
      days: number,
      hour: number,
      customerCode: string,
      paymentType: string,
      priceType: string,
      paidRatio: number,
      lineCodes: { code: string; qty: number }[],
      notes = "",
    ) => {
      const customer = customerByCode[customerCode];
      const lines = lineCodes.map((line) => {
        const product = byCode[line.code];
        const unitPrice = priceType === "جملة" ? product.wholesalePrice : product.salePrice;
        return { productId: product.id, qty: line.qty, unitPrice, taxPercent: 0 };
      });
      const subtotal = r2(lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0));
      await persistDocument(
        tx,
        {
          docType: "sale",
          partyId: customer.id,
          warehouseId: shop.id,
          treasuryId: cashBox.id,
          paymentType,
          priceType,
          discountPercent: 0,
          discountAmount: 0,
          deliveryFee: 0,
          taxPercent: 0,
          paid: r2(subtotal * paidRatio),
          notes,
          lines,
        },
        { allowNegative: true, cashier: "admin", createdAt: daysAgoDate(days, hour) },
      );
    };

    await sell(0, 9, "C-000", "نقدي", "قطاعي", 1, [
      { code: "1001", qty: 4 },
      { code: "1102", qty: 2 },
      { code: "1206", qty: 1 },
    ], "بيع صباحي");
    await sell(0, 11, "C-007", "نقدي", "قطاعي", 1, [
      { code: "1301", qty: 1 },
      { code: "1105", qty: 1 },
    ]);
    await sell(1, 10, "C-001", "آجل", "جملة", 0, [
      { code: "8001", qty: 12 },
      { code: "8002", qty: 12 },
      { code: "1102", qty: 20 },
    ], "توريد مدرسة النور");
    await sell(1, 16, "C-003", "نقدي", "قطاعي", 1, [{ code: "1501", qty: 1 }, { code: "1503", qty: 1 }]);
    await sell(2, 12, "C-000", "نقدي", "قطاعي", 1, [{ code: "1401", qty: 1 }, { code: "1601", qty: 1 }]);
    await sell(3, 13, "C-005", "آجل", "جملة", 0.5, [
      { code: "1607", qty: 4 },
      { code: "1403", qty: 20 },
      { code: "1604", qty: 6 },
    ], "تجهيز مكتب الشركة");
    await sell(4, 15, "C-004", "نقدي", "قطاعي", 1, [
      { code: "8031", qty: 1 },
      { code: "1001", qty: 2 },
      { code: "1104", qty: 3 },
    ]);
    await sell(5, 10, "C-000", "نقدي", "قطاعي", 1, [{ code: "1208", qty: 2 }, { code: "1005", qty: 6 }]);
    await sell(6, 18, "C-006", "آجل", "جملة", 0, [{ code: "8051", qty: 5 }, { code: "8052", qty: 5 }], "مكتبة الجامعة");

    const penLines = [
      { productId: byCode["1001"].id, qty: 40, unitPrice: byCode["1001"].costPrice, taxPercent: 0 },
      { productId: byCode["1002"].id, qty: 40, unitPrice: byCode["1002"].costPrice, taxPercent: 0 },
      { productId: byCode["1005"].id, qty: 60, unitPrice: byCode["1005"].costPrice, taxPercent: 0 },
    ];
    await persistDocument(
      tx,
      {
        docType: "purchase",
        partyId: supplierByCode["S-001"].id,
        warehouseId: store.id,
        treasuryId: cashBox.id,
        paymentType: "نقدي",
        priceType: "جملة",
        discountPercent: 0,
        discountAmount: 0,
        deliveryFee: 0,
        taxPercent: 0,
        paid: r2(penLines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0)),
        notes: "توريد أقلام",
        lines: penLines,
      },
      { allowNegative: true, cashier: "admin", createdAt: daysAgoDate(3, 9) },
    );

    await persistDocument(
      tx,
      {
        docType: "purchase",
        partyId: supplierByCode["S-002"].id,
        warehouseId: bookStore.id,
        treasuryId: cashBox.id,
        paymentType: "آجل",
        priceType: "جملة",
        discountPercent: 0,
        discountAmount: 0,
        deliveryFee: 0,
        taxPercent: 0,
        paid: 0,
        notes: "كتب بداية الترم",
        lines: [
          { productId: byCode["8001"].id, qty: 20, unitPrice: byCode["8001"].costPrice, taxPercent: 0 },
          { productId: byCode["8031"].id, qty: 15, unitPrice: byCode["8031"].costPrice, taxPercent: 0 },
        ],
      },
      { allowNegative: true, cashier: "admin", createdAt: daysAgoDate(8, 11) },
    );

    await tx.insert(expenses).values([
      { category: "كهرباء", amount: 380, treasuryId: cashBox.id, notes: "فاتورة الكهرباء", employeeId: null, createdAt: daysAgoDate(1, 14) },
      { category: "نقل", amount: 120, treasuryId: cashBox.id, notes: "توصيل طلب مدرسة", employeeId: null, createdAt: daysAgoDate(2, 17) },
    ]);
    await changeTreasury(tx, cashBox.id, -380, "expense", "كهرباء", "فاتورة الكهرباء");
    await changeTreasury(tx, cashBox.id, -120, "expense", "نقل", "توصيل طلب مدرسة");

    const [transfer] = await tx
      .insert(transfers)
      .values({
        number: 5001,
        fromWarehouseId: bookStore.id,
        toWarehouseId: shop.id,
        notes: "تغذية المعرض بكتب أولى إعدادي",
        status: "saved",
        createdAt: daysAgoDate(2, 8),
      })
      .returning();
    const moved = [byCode["8031"], byCode["8032"]];
    await tx.insert(transferItems).values(
      moved.map((product) => ({ transferId: transfer.id, productId: product.id, name: product.name, code: product.code, qty: 6 })),
    );
    for (const product of moved) {
      await changeStock(tx, product.id, bookStore.id, -6, "transfer", "تحويل للمعرض", true, product.name, transfer.id);
      await changeStock(tx, product.id, shop.id, 6, "transfer", "وارد من مخزن الكتب", true, product.name, transfer.id);
    }

    const today = cairoDay();
    const staff = Object.fromEntries((await tx.select().from(employees)).map((row) => [row.code, row]));
    await tx.insert(attendance).values([
      { employeeId: staff["E-001"].id, day: today, checkIn: "09:05", checkOut: null, status: "حاضر" },
      { employeeId: staff["E-002"].id, day: today, checkIn: "09:12", checkOut: null, status: "حاضر" },
      { employeeId: staff["E-003"].id, day: today, checkIn: null, checkOut: null, status: "غائب" },
    ]);

    await tx.insert(messages).values([
      { name: "مدرسة النور", phone: "01022001133", body: "محتاجين 30 كتاب خارجي رياضيات أولى ابتدائي الأسبوع الجاي." },
      { name: "أحمد محمود", phone: "01005551234", body: "هل حقيبة الإعدادي متوفرة باللون الكحلي؟" },
    ]);

    await persistDocument(
      tx,
      {
        docType: "sale",
        partyId: customerByCode["C-004"].id,
        warehouseId: shop.id,
        treasuryId: cashBox.id,
        paymentType: "نقدي",
        priceType: "قطاعي",
        discountPercent: 0,
        discountAmount: 0,
        deliveryFee: 0,
        taxPercent: 0,
        paid: 0,
        notes: "فاتورة معلقة — الزبون راجع",
        suspend: true,
        lines: [{ productId: byCode["1502"].id, qty: 1, unitPrice: byCode["1502"].salePrice, taxPercent: 0 }],
      },
      { allowNegative: true, cashier: settingsRow.cashierName },
    );
  });
}

function mapDoc(row: typeof documents.$inferSelect) {
  return {
    id: row.id,
    docType: row.docType,
    number: row.number,
    createdAt: iso(row.createdAt),
    partyId: row.partyId,
    partyName: row.partyName,
    warehouseId: row.warehouseId,
    treasuryId: row.treasuryId,
    paymentType: row.paymentType,
    priceType: row.priceType,
    discountPercent: Number(row.discountPercent),
    discountAmount: Number(row.discountAmount),
    taxAmount: Number(row.taxAmount),
    deliveryFee: Number(row.deliveryFee),
    subtotal: Number(row.subtotal),
    total: Number(row.total),
    paid: Number(row.paid),
    changeAmount: Number(row.changeAmount),
    previousBalance: Number(row.previousBalance),
    notes: row.notes,
    status: row.status,
    cashier: row.cashier,
    sourceInvoiceId: row.sourceInvoiceId,
  };
}

async function buildBootstrap(): Promise<BootstrapData> {
  const [settingsRow] = await db.select().from(settings).limit(1);
  const categoryRows = await db.select().from(categories).orderBy(categories.sortOrder);
  const productRows = await db.select().from(products).orderBy(products.code);
  const stockRows = await db.select().from(stocks);
  const warehouseRows = await db.select().from(warehouses).orderBy(warehouses.id);
  const customerRows = await db.select().from(customers).orderBy(customers.id);
  const supplierRows = await db.select().from(suppliers).orderBy(suppliers.id);
  const employeeRows = await db.select().from(employees).orderBy(employees.id);
  const treasuryRows = await db.select().from(treasuries).orderBy(treasuries.id);
  const savedDocs = await db.select().from(documents).where(eq(documents.status, "saved")).orderBy(desc(documents.id)).limit(80);
  const suspendedDocs = await db.select().from(documents).where(eq(documents.status, "suspended")).orderBy(desc(documents.id));
  const voidDocs = await db.select().from(documents).where(eq(documents.status, "void")).orderBy(desc(documents.id)).limit(15);
  const moveRows = await db.select().from(cashMoves).orderBy(desc(cashMoves.id)).limit(120);
  const expenseRows = await db.select().from(expenses).orderBy(desc(expenses.id)).limit(80);
  const attendanceRows = await db.select().from(attendance).orderBy(desc(attendance.day)).limit(120);
  const transferRows = await db.select().from(transfers).orderBy(desc(transfers.id)).limit(30);
  const transferIds = transferRows.map((row) => row.id);
  const transferItemRows = transferIds.length
    ? await db.select().from(transferItems).where(inArray(transferItems.transferId, transferIds))
    : [];
  const messageRows = await db.select().from(messages).orderBy(desc(messages.id)).limit(40);
  const shiftRows = await db.select().from(shiftCloses).orderBy(desc(shiftCloses.id)).limit(20);
  const planRows = await db.select().from(installmentPlans).orderBy(desc(installmentPlans.id)).limit(40);
  const planIds = planRows.map((row) => row.id);
  const dueRows = planIds.length ? await db.select().from(installmentDues).where(inArray(installmentDues.planId, planIds)) : [];
  const priceRows = await db
    .select({
      customerId: documents.partyId,
      productId: documentItems.productId,
      unitPrice: documentItems.unitPrice,
    })
    .from(documentItems)
    .innerJoin(documents, eq(documents.id, documentItems.documentId))
    .where(and(eq(documents.docType, "sale"), eq(documents.status, "saved")))
    .orderBy(desc(documents.id))
    .limit(250);

  const today = cairoDay();
  const monthStart = `${today.slice(0, 7)}-01`;
  const dayExpr = sql`(${documents.createdAt} AT TIME ZONE 'Africa/Cairo')::date`;

  const [todaySales] = await db
    .select({
      total: sql<number>`coalesce(sum(${documents.total}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(documents)
    .where(and(eq(documents.docType, "sale"), eq(documents.status, "saved"), sql`${dayExpr} = ${today}::date`));

  const [monthSales] = await db
    .select({ total: sql<number>`coalesce(sum(${documents.total}), 0)` })
    .from(documents)
    .where(and(eq(documents.docType, "sale"), eq(documents.status, "saved"), sql`${dayExpr} >= ${monthStart}::date`));

  const [monthPurchases] = await db
    .select({ total: sql<number>`coalesce(sum(${documents.total}), 0)` })
    .from(documents)
    .where(and(eq(documents.docType, "purchase"), eq(documents.status, "saved"), sql`${dayExpr} >= ${monthStart}::date`));

  const profitFor = async (from?: string) => {
    const filters = [eq(documents.status, "saved"), inArray(documents.docType, ["sale", "saleReturn"])];
    if (from) filters.push(sql`${dayExpr} >= ${from}::date`);
    const rows = await db
      .select({
        docType: documents.docType,
        profit: sql<number>`coalesce(sum(${documentItems.qty} * (${documentItems.unitPrice} - ${documentItems.costPrice})), 0)`,
      })
      .from(documentItems)
      .innerJoin(documents, eq(documents.id, documentItems.documentId))
      .where(and(...filters))
      .groupBy(documents.docType);
    let profit = 0;
    for (const row of rows) {
      const sign = row.docType === "saleReturn" ? -1 : 1;
      profit += sign * Number(row.profit);
    }
    const discountRows = await db
      .select({
        docType: documents.docType,
        discount: sql<number>`coalesce(sum(${documents.discountAmount}), 0)`,
      })
      .from(documents)
      .where(and(...filters))
      .groupBy(documents.docType);
    for (const row of discountRows) {
      const sign = row.docType === "saleReturn" ? -1 : 1;
      profit -= sign * Number(row.discount);
    }
    return r2(profit);
  };

  const todayProfit = await profitFor(today);
  const monthProfit = await profitFor(monthStart);

  const topRows = await db
    .select({
      name: documentItems.name,
      qty: sql<number>`coalesce(sum(${documentItems.qty}), 0)`,
      total: sql<number>`coalesce(sum(${documentItems.lineTotal}), 0)`,
    })
    .from(documentItems)
    .innerJoin(documents, eq(documents.id, documentItems.documentId))
    .where(and(eq(documents.docType, "sale"), eq(documents.status, "saved"), sql`${dayExpr} >= ${monthStart}::date`))
    .groupBy(documentItems.name)
    .orderBy(sql`sum(${documentItems.qty}) desc`)
    .limit(6);

  const dayRows = await db
    .select({
      day: sql<string>`to_char((${documents.createdAt} AT TIME ZONE 'Africa/Cairo')::date, 'YYYY-MM-DD')`,
      total: sql<number>`coalesce(sum(${documents.total}), 0)`,
    })
    .from(documents)
    .where(
      and(
        eq(documents.docType, "sale"),
        eq(documents.status, "saved"),
        sql`(${documents.createdAt} AT TIME ZONE 'Africa/Cairo')::date >= ((now() AT TIME ZONE 'Africa/Cairo')::date - 6)`,
      ),
    )
    .groupBy(sql`(${documents.createdAt} AT TIME ZONE 'Africa/Cairo')::date`)
    .orderBy(sql`(${documents.createdAt} AT TIME ZONE 'Africa/Cairo')::date`);

  const salesByDay = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const day = cairoDay(date);
    const found = dayRows.find((row) => row.day === day);
    return { day, total: r2(Number(found?.total || 0)) };
  });

  const stockByProduct = new Map<number, { warehouseId: number; qty: number }[]>();
  for (const row of stockRows) {
    const list = stockByProduct.get(row.productId) ?? [];
    list.push({ warehouseId: row.warehouseId, qty: Number(row.qty) });
    stockByProduct.set(row.productId, list);
  }

  const productDtos = productRows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    categoryId: row.categoryId,
    unit: row.unit,
    costPrice: Number(row.costPrice),
    salePrice: Number(row.salePrice),
    wholesalePrice: Number(row.wholesalePrice),
    taxPercent: Number(row.taxPercent),
    minStock: row.minStock,
    grade: row.grade,
    subject: row.subject,
    stage: row.stage,
    publisher: row.publisher,
    active: row.active,
    stocks: stockByProduct.get(row.id) ?? [],
  }));

  const lowStock = productDtos
    .filter((product) => product.active)
    .map((product) => ({
      id: product.id,
      name: product.name,
      code: product.code,
      qty: r2(product.stocks.reduce((sum, item) => sum + item.qty, 0)),
      minStock: product.minStock,
    }))
    .filter((product) => product.qty <= product.minStock)
    .slice(0, 8);

  const stockValue = r2(
    productDtos.reduce((sum, product) => sum + product.costPrice * product.stocks.reduce((inner, item) => inner + item.qty, 0), 0),
  );

  const docs = [...suspendedDocs, ...savedDocs, ...voidDocs].sort((a, b) => b.id - a.id);
  const nextNumbers: Record<string, number> = {};
  for (const key of Object.keys(NUMBER_FLOOR)) {
    const [row] = await db
      .select({ n: sql<number>`coalesce(max(${documents.number}), 0)` })
      .from(documents)
      .where(eq(documents.docType, key));
    nextNumbers[key] = Math.max(NUMBER_FLOOR[key], Number(row?.n || 0)) + 1;
  }
  const [transferMax] = await db.select({ n: sql<number>`coalesce(max(${transfers.number}), 0)` }).from(transfers);
  nextNumbers.transfer = Math.max(5000, Number(transferMax?.n || 0)) + 1;

  return {
    settings: {
      id: settingsRow.id,
      storeName: settingsRow.storeName,
      activity: settingsRow.activity,
      phone: settingsRow.phone,
      phone2: settingsRow.phone2,
      website: settingsRow.website,
      email: settingsRow.email,
      address: settingsRow.address,
      taxPercent: Number(settingsRow.taxPercent),
      allowNegative: settingsRow.allowNegative,
      autoFillPaid: settingsRow.autoFillPaid,
      footerNote: settingsRow.footerNote,
      cashierName: settingsRow.cashierName,
      currency: settingsRow.currency || "ج.م",
      season: settingsRow.season || "2026-2027",
      installmentMonths: Number(settingsRow.installmentMonths || 4),
      downPercent: Number(settingsRow.downPercent || 25),
      lateFee: Number(settingsRow.lateFee || 0),
      returnDays: Number(settingsRow.returnDays || 7),
      bookReturnDays: Number(settingsRow.bookReturnDays || 3),
      defaultPayment: settingsRow.defaultPayment || "نقدي",
      theme: settingsRow.theme || "classic",
      loginUser: settingsRow.loginUser || "admin",
    },
    recentPrices: priceRows
      .filter((row) => row.customerId)
      .map((row) => ({ customerId: Number(row.customerId), productId: row.productId, unitPrice: Number(row.unitPrice) })),
    categories: categoryRows.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      sortOrder: row.sortOrder,
      kind: row.kind,
    })),
    products: productDtos,
    warehouses: warehouseRows.map((row) => ({ id: row.id, name: row.name, isDefault: row.isDefault, notes: row.notes })),
    customers: customerRows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      phone: row.phone,
      address: row.address,
      balance: Number(row.balance),
      priceType: row.priceType,
      isSystem: row.isSystem,
      notes: row.notes,
    })),
    suppliers: supplierRows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      phone: row.phone,
      address: row.address,
      balance: Number(row.balance),
      notes: row.notes,
    })),
    employees: employeeRows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      jobTitle: row.jobTitle,
      phone: row.phone,
      salary: Number(row.salary),
      hireDate: row.hireDate,
      active: row.active,
    })),
    treasuries: treasuryRows.map((row) => ({ id: row.id, name: row.name, balance: Number(row.balance), kind: row.kind })),
    documents: docs.map(mapDoc),
    cashMoves: moveRows.map((row) => ({
      id: row.id,
      createdAt: iso(row.createdAt),
      treasuryId: row.treasuryId,
      direction: row.direction,
      amount: Number(row.amount),
      source: row.source,
      partyName: row.partyName,
      notes: row.notes,
      refId: row.refId,
    })),
    expenses: expenseRows.map((row) => ({
      id: row.id,
      createdAt: iso(row.createdAt),
      category: row.category,
      amount: Number(row.amount),
      treasuryId: row.treasuryId,
      notes: row.notes,
      employeeId: row.employeeId,
    })),
    attendance: attendanceRows.map((row) => ({
      id: row.id,
      employeeId: row.employeeId,
      day: row.day,
      checkIn: row.checkIn,
      checkOut: row.checkOut,
      status: row.status,
    })),
    transfers: transferRows.map((row) => ({
      id: row.id,
      number: row.number,
      createdAt: iso(row.createdAt),
      fromWarehouseId: row.fromWarehouseId,
      toWarehouseId: row.toWarehouseId,
      notes: row.notes,
      status: row.status,
      items: transferItemRows
        .filter((item) => item.transferId === row.id)
        .map((item) => ({ productId: item.productId, name: item.name, code: item.code, qty: Number(item.qty) })),
    })),
    messages: messageRows.map((row) => ({
      id: row.id,
      createdAt: iso(row.createdAt),
      name: row.name,
      phone: row.phone,
      body: row.body,
    })),
    installments: planRows.map((row) => ({
      id: row.id,
      number: row.number,
      customerId: row.customerId,
      customerName: row.customerName,
      createdAt: iso(row.createdAt),
      total: Number(row.total),
      downPayment: Number(row.downPayment),
      months: row.months,
      monthlyAmount: Number(row.monthlyAmount),
      paidAmount: Number(row.paidAmount),
      status: row.status,
      notes: row.notes,
    })),
    dues: dueRows.map((row) => ({
      id: row.id,
      planId: row.planId,
      dueNo: row.dueNo,
      dueDate: row.dueDate,
      amount: Number(row.amount),
      paid: Number(row.paid),
      status: row.dueDate < cairoDay() && row.status !== "مسدد" ? "متأخر" : row.status,
    })),
    shifts: shiftRows.map((row) => ({
      id: row.id,
      createdAt: iso(row.createdAt),
      treasuryId: row.treasuryId,
      systemBalance: Number(row.systemBalance),
      counted: Number(row.counted),
      difference: Number(row.difference),
      notes: row.notes,
      cashier: row.cashier,
    })),
    stats: {
      todaySales: r2(Number(todaySales?.total || 0)),
      todayProfit,
      todayInvoices: Number(todaySales?.count || 0),
      monthSales: r2(Number(monthSales?.total || 0)),
      monthPurchases: r2(Number(monthPurchases?.total || 0)),
      monthProfit,
      customerDebt: r2(customerRows.reduce((sum, row) => sum + Math.max(0, Number(row.balance)), 0)),
      supplierDebt: r2(supplierRows.reduce((sum, row) => sum + Math.max(0, Number(row.balance)), 0)),
      stockValue,
      lowStock,
      topProducts: topRows.map((row) => ({ name: row.name, qty: r2(Number(row.qty)), total: r2(Number(row.total)) })),
      salesByDay,
      suspended: suspendedDocs.length,
    },
    nextNumbers,
    serverTime: new Date().toISOString(),
  };
}

function lineInputs(value: unknown): LineInput[] {
  if (!Array.isArray(value)) return [];
  return value.map((line) => {
    const row = line as Record<string, unknown>;
    return {
      productId: num(row.productId),
      qty: num(row.qty),
      unitPrice: num(row.unitPrice),
      taxPercent: num(row.taxPercent),
    };
  });
}

export async function getBootstrap() {
  await ensureTables();
  await ensureSeeded();
  return buildBootstrap();
}

export async function runAction(body: Record<string, unknown>) {
  await ensureTables();
  await ensureSeeded();
  const type = str(body.type);
  const [settingsRow] = await db.select().from(settings).limit(1);
  if (!settingsRow) throw new Error("الإعدادات غير جاهزة");

  if (type === "saveDocument") {
    const input: DocInput = {
      id: body.id ? num(body.id) : undefined,
      docType: str(body.docType) as DocInput["docType"],
      partyId: body.partyId ? num(body.partyId) : null,
      warehouseId: num(body.warehouseId),
      treasuryId: num(body.treasuryId),
      paymentType: str(body.paymentType, "نقدي"),
      priceType: str(body.priceType, "قطاعي"),
      discountPercent: num(body.discountPercent),
      discountAmount: num(body.discountAmount),
      deliveryFee: num(body.deliveryFee),
      taxPercent: num(body.taxPercent),
      paid: num(body.paid),
      notes: str(body.notes),
      sourceInvoiceId: body.sourceInvoiceId ? num(body.sourceInvoiceId) : null,
      lines: lineInputs(body.lines),
      suspend: Boolean(body.suspend),
    };
    if (!["sale", "purchase", "saleReturn", "purchaseReturn"].includes(input.docType)) {
      throw new Error("نوع الفاتورة غير معروف");
    }
    const saved = await db.transaction(async (tx) =>
      persistDocument(tx, input, { allowNegative: settingsRow.allowNegative, cashier: settingsRow.cashierName }),
    );
    return {
      document: mapDoc(saved.document),
      items: saved.items.map((item: {
        id: number;
        documentId: number;
        productId: number;
        code: string;
        name: string;
        unit: string;
        qty: number;
        unitPrice: number;
        costPrice: number;
        taxPercent: number;
        lineTotal: number;
      }) => ({
        id: item.id,
        documentId: item.documentId,
        productId: item.productId,
        code: item.code,
        name: item.name,
        unit: item.unit,
        qty: Number(item.qty),
        unitPrice: Number(item.unitPrice),
        costPrice: Number(item.costPrice),
        taxPercent: Number(item.taxPercent),
        lineTotal: Number(item.lineTotal),
      })),
    };
  }

  if (type === "getDocument") {
    const id = num(body.id);
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    if (!document) throw new Error("الفاتورة غير موجودة");
    const items = await db.select().from(documentItems).where(eq(documentItems.documentId, id)).orderBy(documentItems.id);
    return {
      document: mapDoc(document),
      items: items.map((item) => ({
        id: item.id,
        documentId: item.documentId,
        productId: item.productId,
        code: item.code,
        name: item.name,
        unit: item.unit,
        qty: Number(item.qty),
        unitPrice: Number(item.unitPrice),
        costPrice: Number(item.costPrice),
        taxPercent: Number(item.taxPercent),
        lineTotal: Number(item.lineTotal),
      })),
    };
  }

  if (type === "voidDocument") {
    const id = num(body.id);
    await db.transaction(async (tx) => {
      const [doc] = await tx.select().from(documents).where(eq(documents.id, id));
      if (!doc) throw new Error("الفاتورة غير موجودة");
      if (doc.status === "void") throw new Error("الفاتورة ملغاة مسبقاً");
      if (doc.status === "suspended") {
        await tx.delete(documentItems).where(eq(documentItems.documentId, id));
        await tx.delete(documents).where(eq(documents.id, id));
        return;
      }
      const items = await tx.select().from(documentItems).where(eq(documentItems.documentId, id));
      await applyEffects(tx, {
        docType: doc.docType,
        docId: doc.id,
        lines: items.map((item) => ({ productId: item.productId, name: item.name, qty: Number(item.qty) })),
        warehouseId: doc.warehouseId,
        treasuryId: doc.treasuryId,
        partyId: doc.partyId,
        partyName: doc.partyName,
        paymentType: doc.paymentType,
        total: Number(doc.total),
        paid: Number(doc.paid),
        allowNegative: true,
        reverse: true,
        number: doc.number,
      });
      await tx.update(documents).set({ status: "void" }).where(eq(documents.id, id));
    });
    return { voided: id };
  }

  if (type === "saveProduct") {
    const id = body.id ? num(body.id) : 0;
    const name = str(body.name);
    if (!name) throw new Error("اسم الصنف مطلوب");
    const categoryId = num(body.categoryId);
    if (!categoryId) throw new Error("اختر القسم");
    let code = str(body.code);
    if (!code) {
      const rows = await db.select({ code: products.code }).from(products);
      const used = new Set(rows.map((row) => row.code));
      let n = 1700 + rows.length;
      while (used.has(String(n))) n += 1;
      code = String(n);
    }
    const values = {
      code,
      name,
      categoryId,
      unit: str(body.unit, "قطعة"),
      costPrice: r2(num(body.costPrice)),
      salePrice: r2(num(body.salePrice)),
      wholesalePrice: r2(num(body.wholesalePrice)),
      taxPercent: r2(num(body.taxPercent)),
      minStock: Math.max(0, Math.round(num(body.minStock))),
      grade: str(body.grade) || null,
      subject: str(body.subject) || null,
      stage: str(body.stage) || null,
      publisher: str(body.publisher) || null,
      active: body.active === undefined ? true : Boolean(body.active),
    };
    const savedId = await db.transaction(async (tx) => {
      const dup = await tx.select().from(products).where(eq(products.code, code));
      if (dup.some((row) => row.id !== id)) throw new Error("كود الصنف مستخدم");
      let productId = id;
      if (id) {
        await tx.update(products).set(values).where(eq(products.id, id));
      } else {
        const [created] = await tx.insert(products).values(values).returning();
        productId = created.id;
      }
      if (Array.isArray(body.stocks)) {
        for (const entry of body.stocks as Record<string, unknown>[]) {
          const warehouseId = num(entry.warehouseId);
          const qty = r2(num(entry.qty));
          const current = await readStock(tx, productId, warehouseId);
          const delta = r2(qty - Number(current?.qty || 0));
          if (Math.abs(delta) > 0.001) {
            await changeStock(tx, productId, warehouseId, delta, "adjust", "تعديل جرد", true, name);
          } else if (!current) {
            await tx.insert(stocks).values({ productId, warehouseId, qty: 0 });
          }
        }
      }
      return productId;
    });
    return { id: savedId };
  }

  if (type === "deleteProduct") {
    const id = num(body.id);
    await db.update(products).set({ active: false }).where(eq(products.id, id));
    return { id };
  }

  if (type === "saveCustomer") {
    const id = body.id ? num(body.id) : 0;
    const name = str(body.name);
    if (!name) throw new Error("اسم العميل مطلوب");
    const values = {
      code: str(body.code) || `C-${Date.now().toString().slice(-4)}`,
      name,
      phone: str(body.phone) || null,
      address: str(body.address) || null,
      priceType: str(body.priceType, "قطاعي"),
      notes: str(body.notes) || null,
    };
    if (id) {
      await db.update(customers).set(values).where(eq(customers.id, id));
      return { id };
    }
    const [created] = await db.insert(customers).values({ ...values, balance: 0, isSystem: false }).returning();
    return { id: created.id };
  }

  if (type === "deleteCustomer") {
    const id = num(body.id);
    const [row] = await db.select().from(customers).where(eq(customers.id, id));
    if (!row) throw new Error("العميل غير موجود");
    if (row.isSystem) throw new Error("لا يمكن حذف العميل النقدي");
    if (Math.abs(Number(row.balance)) > 0.01) throw new Error("لا يمكن الحذف وعليه رصيد");
    const used = await db.select().from(documents).where(eq(documents.partyId, id)).limit(1);
    if (used.length) throw new Error("لا يمكن الحذف لوجود فواتير");
    await db.delete(customers).where(eq(customers.id, id));
    return { id };
  }

  if (type === "saveSupplier") {
    const id = body.id ? num(body.id) : 0;
    const name = str(body.name);
    if (!name) throw new Error("اسم المورد مطلوب");
    const values = {
      code: str(body.code) || `S-${Date.now().toString().slice(-4)}`,
      name,
      phone: str(body.phone) || null,
      address: str(body.address) || null,
      notes: str(body.notes) || null,
    };
    if (id) {
      await db.update(suppliers).set(values).where(eq(suppliers.id, id));
      return { id };
    }
    const [created] = await db.insert(suppliers).values({ ...values, balance: 0 }).returning();
    return { id: created.id };
  }

  if (type === "deleteSupplier") {
    const id = num(body.id);
    const [row] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    if (!row) throw new Error("المورد غير موجود");
    if (Math.abs(Number(row.balance)) > 0.01) throw new Error("لا يمكن الحذف وعليه رصيد");
    await db.delete(suppliers).where(eq(suppliers.id, id));
    return { id };
  }

  if (type === "saveEmployee") {
    const id = body.id ? num(body.id) : 0;
    const name = str(body.name);
    if (!name) throw new Error("اسم الموظف مطلوب");
    const values = {
      code: str(body.code) || `E-${Date.now().toString().slice(-4)}`,
      name,
      jobTitle: str(body.jobTitle, "مبيعات"),
      phone: str(body.phone) || null,
      salary: r2(num(body.salary)),
      hireDate: str(body.hireDate) || null,
      active: body.active === undefined ? true : Boolean(body.active),
    };
    if (id) {
      await db.update(employees).set(values).where(eq(employees.id, id));
      return { id };
    }
    const [created] = await db.insert(employees).values(values).returning();
    return { id: created.id };
  }

  if (type === "deleteEmployee") {
    await db.update(employees).set({ active: false }).where(eq(employees.id, num(body.id)));
    return { id: num(body.id) };
  }

  if (type === "saveWarehouse") {
    const id = body.id ? num(body.id) : 0;
    const name = str(body.name);
    if (!name) throw new Error("اسم المخزن مطلوب");
    const isDefault = Boolean(body.isDefault);
    const saved = await db.transaction(async (tx) => {
      if (isDefault) await tx.update(warehouses).set({ isDefault: false });
      if (id) {
        await tx.update(warehouses).set({ name, isDefault, notes: str(body.notes) || null }).where(eq(warehouses.id, id));
        return id;
      }
      const [created] = await tx.insert(warehouses).values({ name, isDefault, notes: str(body.notes) || null }).returning();
      const allProducts = await tx.select().from(products);
      if (allProducts.length) {
        await tx.insert(stocks).values(allProducts.map((product) => ({ productId: product.id, warehouseId: created.id, qty: 0 })));
      }
      return created.id;
    });
    return { id: saved };
  }

  if (type === "saveCategory") {
    const id = body.id ? num(body.id) : 0;
    const name = str(body.name);
    if (!name) throw new Error("اسم القسم مطلوب");
    const values = {
      name,
      color: str(body.color, "#3b82f6"),
      sortOrder: Math.round(num(body.sortOrder)),
      kind: str(body.kind, "stationery"),
    };
    if (id) {
      await db.update(categories).set(values).where(eq(categories.id, id));
      return { id };
    }
    const [created] = await db.insert(categories).values(values).returning();
    return { id: created.id };
  }

  if (type === "saveSettings") {
    await db
      .update(settings)
      .set({
        storeName: str(body.storeName, settingsRow.storeName),
        activity: str(body.activity, settingsRow.activity),
        phone: str(body.phone, settingsRow.phone),
        phone2: str(body.phone2) || null,
        website: str(body.website) || null,
        email: str(body.email) || null,
        address: str(body.address) || null,
        taxPercent: r2(num(body.taxPercent)),
        allowNegative: Boolean(body.allowNegative),
        autoFillPaid: Boolean(body.autoFillPaid),
        footerNote: str(body.footerNote) || null,
        cashierName: str(body.cashierName, "admin"),
        currency: str(body.currency, "ج.م"),
        season: str(body.season, "2026-2027"),
        installmentMonths: Math.max(1, Math.round(num(body.installmentMonths, 4))),
        downPercent: r2(num(body.downPercent, 25)),
        lateFee: r2(num(body.lateFee)),
        returnDays: Math.max(0, Math.round(num(body.returnDays, 7))),
        bookReturnDays: Math.max(0, Math.round(num(body.bookReturnDays, 3))),
        defaultPayment: str(body.defaultPayment, "نقدي"),
        theme: str(body.theme, "classic"),
        loginUser: str(body.loginUser, "admin"),
        ...(str(body.loginPin) ? { loginPin: str(body.loginPin) } : {}),
      })
      .where(eq(settings.id, settingsRow.id));
    return { ok: true };
  }

  if (type === "cashMove") {
    const amount = r2(num(body.amount));
    if (amount <= 0) throw new Error("أدخل المبلغ");
    const direction = str(body.direction) === "out" ? "out" : "in";
    const treasuryId = num(body.treasuryId);
    const partyKindName = str(body.partyKind);
    const partyId = body.partyId ? num(body.partyId) : null;
    let partyName = str(body.partyName);
    await db.transaction(async (tx) => {
      if (partyKindName === "customer" && partyId) {
        const [customer] = await tx.select().from(customers).where(eq(customers.id, partyId));
        if (!customer) throw new Error("العميل غير موجود");
        partyName = customer.name;
        await changePartyBalance(tx, "customer", partyId, direction === "in" ? -amount : amount);
      }
      if (partyKindName === "supplier" && partyId) {
        const [supplier] = await tx.select().from(suppliers).where(eq(suppliers.id, partyId));
        if (!supplier) throw new Error("المورد غير موجود");
        partyName = supplier.name;
        await changePartyBalance(tx, "supplier", partyId, direction === "out" ? -amount : amount);
      }
      await changeTreasury(
        tx,
        treasuryId,
        direction === "in" ? amount : -amount,
        direction === "in" ? "receipt" : "payment",
        partyName || null,
        str(body.notes) || null,
      );
    });
    return { ok: true };
  }

  if (type === "saveExpense") {
    const amount = r2(num(body.amount));
    if (amount <= 0) throw new Error("أدخل مبلغ المصروف");
    const category = str(body.category, "نثرية");
    const treasuryId = num(body.treasuryId);
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(expenses)
        .values({
          category,
          amount,
          treasuryId,
          notes: str(body.notes) || null,
          employeeId: body.employeeId ? num(body.employeeId) : null,
        })
        .returning();
      await changeTreasury(tx, treasuryId, -amount, body.employeeId ? "salary" : "expense", category, str(body.notes) || category, created.id);
    });
    return { ok: true };
  }

  if (type === "deleteExpense") {
    const id = num(body.id);
    await db.transaction(async (tx) => {
      const [row] = await tx.select().from(expenses).where(eq(expenses.id, id));
      if (!row) throw new Error("المصروف غير موجود");
      await changeTreasury(tx, row.treasuryId, Number(row.amount), "adjust", row.category, "إلغاء مصروف", row.id);
      await tx.delete(expenses).where(eq(expenses.id, id));
    });
    return { id };
  }

  if (type === "paySalary") {
    const employeeId = num(body.employeeId);
    const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId));
    if (!employee) throw new Error("الموظف غير موجود");
    const amount = r2(num(body.amount, employee.salary));
    const treasuryId = num(body.treasuryId);
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(expenses)
        .values({
          category: "مرتبات",
          amount,
          treasuryId,
          notes: `راتب ${employee.name}`,
          employeeId,
        })
        .returning();
      await changeTreasury(tx, treasuryId, -amount, "salary", employee.name, `صرف راتب ${employee.name}`, created.id);
    });
    return { ok: true };
  }

  if (type === "attendance") {
    const employeeId = num(body.employeeId);
    const action = str(body.action, "in");
    const day = cairoDay();
    const time = cairoTime();
    const status = action === "absent" ? "غائب" : action === "leave" ? "إجازة" : "حاضر";
    const [existing] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.employeeId, employeeId), eq(attendance.day, day)));
    if (!existing) {
      await db.insert(attendance).values({
        employeeId,
        day,
        checkIn: action === "in" ? time : null,
        checkOut: action === "out" ? time : null,
        status,
      });
    } else {
      await db
        .update(attendance)
        .set({
          status,
          checkIn: action === "in" ? time : existing.checkIn,
          checkOut: action === "out" ? time : existing.checkOut,
        })
        .where(eq(attendance.id, existing.id));
    }
    return { ok: true };
  }

  if (type === "saveTransfer") {
    const fromWarehouseId = num(body.fromWarehouseId);
    const toWarehouseId = num(body.toWarehouseId);
    if (!fromWarehouseId || !toWarehouseId || fromWarehouseId === toWarehouseId) throw new Error("اختر مخزنين مختلفين");
    const lines = lineInputs(body.lines).filter((line) => line.qty > 0);
    if (!lines.length) throw new Error("أضف أصنافاً للتحويل");
    await db.transaction(async (tx) => {
      const number = (await tx.select({ n: sql<number>`coalesce(max(${transfers.number}), 5000)` }).from(transfers))[0];
      const [created] = await tx
        .insert(transfers)
        .values({
          number: Math.max(5000, Number(number?.n || 5000)) + 1,
          fromWarehouseId,
          toWarehouseId,
          notes: str(body.notes) || null,
          status: "saved",
        })
        .returning();
      const productMap = await loadProductMap(tx);
      for (const line of lines) {
        const product = productMap.get(line.productId);
        if (!product) throw new Error("صنف غير موجود");
        await changeStock(tx, product.id, fromWarehouseId, -line.qty, "transfer", `تحويل #${created.number}`, settingsRow.allowNegative, product.name, created.id);
        await changeStock(tx, product.id, toWarehouseId, line.qty, "transfer", `تحويل #${created.number}`, true, product.name, created.id);
        await tx.insert(transferItems).values({
          transferId: created.id,
          productId: product.id,
          name: product.name,
          code: product.code,
          qty: line.qty,
        });
      }
    });
    return { ok: true };
  }

  if (type === "closeShift") {
    const treasuryId = num(body.treasuryId);
    const counted = r2(num(body.counted));
    await db.transaction(async (tx) => {
      const [treasury] = await tx.select().from(treasuries).where(eq(treasuries.id, treasuryId));
      if (!treasury) throw new Error("الخزينة غير موجودة");
      const systemBalance = r2(Number(treasury.balance));
      const difference = r2(counted - systemBalance);
      const [created] = await tx
        .insert(shiftCloses)
        .values({
          treasuryId,
          systemBalance,
          counted,
          difference,
          notes: str(body.notes) || null,
          cashier: settingsRow.cashierName,
        })
        .returning();
      if (Math.abs(difference) > 0.009) {
        await changeTreasury(tx, treasuryId, difference, "adjust", "إقفال وردية", str(body.notes) || "تسوية جرد الخزينة", created.id);
      }
    });
    return { ok: true };
  }

  if (type === "saveMessage") {
    const name = str(body.name);
    const message = str(body.body);
    if (!name || !message) throw new Error("اكتب الاسم والرسالة");
    const [created] = await db
      .insert(messages)
      .values({ name, phone: str(body.phone) || null, body: message })
      .returning();
    return { id: created.id };
  }

  if (type === "deleteMessage") {
    await db.delete(messages).where(eq(messages.id, num(body.id)));
    return { ok: true };
  }

  if (type === "report") {
    const report = str(body.report, "sales");
    const from = str(body.from) || `${cairoDay().slice(0, 7)}-01`;
    const to = str(body.to) || cairoDay();
    const dayExpr = sql`(${documents.createdAt} AT TIME ZONE 'Africa/Cairo')::date`;
    const inRange = and(sql`${dayExpr} >= ${from}::date`, sql`${dayExpr} <= ${to}::date`);
    if (report === "stock" || report === "lowStock") {
      const data = await buildBootstrap();
      const rows =
        report === "lowStock"
          ? data.stats.lowStock
          : data.products
              .filter((product) => product.active)
              .map((product) => ({
                code: product.code,
                name: product.name,
                qty: r2(product.stocks.reduce((sum, item) => sum + item.qty, 0)),
                cost: product.costPrice,
                sale: product.salePrice,
                value: r2(product.costPrice * product.stocks.reduce((sum, item) => sum + item.qty, 0)),
              }));
      return { report, from, to, rows };
    }
    if (report === "customers") {
      const rows = await db.select().from(customers).orderBy(desc(customers.balance));
      return {
        report,
        from,
        to,
        rows: rows.map((row) => ({ code: row.code, name: row.name, phone: row.phone, balance: Number(row.balance), priceType: row.priceType })),
      };
    }
    if (report === "suppliers") {
      const rows = await db.select().from(suppliers).orderBy(desc(suppliers.balance));
      return {
        report,
        from,
        to,
        rows: rows.map((row) => ({ code: row.code, name: row.name, phone: row.phone, balance: Number(row.balance) })),
      };
    }
    if (report === "expenses") {
      const rows = await db
        .select()
        .from(expenses)
        .where(
          and(
            sql`(${expenses.createdAt} AT TIME ZONE 'Africa/Cairo')::date >= ${from}::date`,
            sql`(${expenses.createdAt} AT TIME ZONE 'Africa/Cairo')::date <= ${to}::date`,
          ),
        )
        .orderBy(desc(expenses.id));
      return {
        report,
        from,
        to,
        rows: rows.map((row) => ({
          date: iso(row.createdAt),
          category: row.category,
          amount: Number(row.amount),
          notes: row.notes,
        })),
      };
    }
    if (report === "cash") {
      const rows = await db
        .select()
        .from(cashMoves)
        .where(
          and(
            sql`(${cashMoves.createdAt} AT TIME ZONE 'Africa/Cairo')::date >= ${from}::date`,
            sql`(${cashMoves.createdAt} AT TIME ZONE 'Africa/Cairo')::date <= ${to}::date`,
          ),
        )
        .orderBy(desc(cashMoves.id))
        .limit(300);
      return {
        report,
        from,
        to,
        rows: rows.map((row) => ({
          date: iso(row.createdAt),
          direction: row.direction,
          amount: Number(row.amount),
          source: row.source,
          partyName: row.partyName,
          notes: row.notes,
          treasuryId: row.treasuryId,
        })),
      };
    }
    if (report === "attendance") {
      const rows = await db.select().from(attendance).where(and(sql`${attendance.day} >= ${from}`, sql`${attendance.day} <= ${to}`));
      return { report, from, to, rows };
    }
    if (report === "itemMove") {
      const productId = num(body.productId);
      const rows = await db
        .select()
        .from(stockMoves)
        .where(
          and(
            eq(stockMoves.productId, productId),
            sql`(${stockMoves.createdAt} AT TIME ZONE 'Africa/Cairo')::date >= ${from}::date`,
            sql`(${stockMoves.createdAt} AT TIME ZONE 'Africa/Cairo')::date <= ${to}::date`,
          ),
        )
        .orderBy(desc(stockMoves.id))
        .limit(200);
      return {
        report,
        from,
        to,
        rows: rows.map((row) => ({
          date: iso(row.createdAt),
          warehouseId: row.warehouseId,
          qtyDelta: Number(row.qtyDelta),
          source: row.source,
          notes: row.notes,
        })),
      };
    }

    const docType = report === "purchases" ? "purchase" : report === "saleReturn" ? "saleReturn" : "sale";
    const docs = await db
      .select()
      .from(documents)
      .where(and(eq(documents.docType, docType), eq(documents.status, "saved"), inRange))
      .orderBy(desc(documents.id))
      .limit(200);
    if (report === "profit") {
      const ids = docs.map((doc) => doc.id);
      const items = ids.length ? await db.select().from(documentItems).where(inArray(documentItems.documentId, ids)) : [];
      return {
        report,
        from,
        to,
        rows: docs.map((doc) => {
          const cost = items.filter((item) => item.documentId === doc.id).reduce((sum, item) => sum + Number(item.qty) * Number(item.costPrice), 0);
          return {
            number: doc.number,
            date: iso(doc.createdAt),
            partyName: doc.partyName,
            total: Number(doc.total),
            cost: r2(cost),
            profit: r2(Number(doc.subtotal) - Number(doc.discountAmount) - cost),
          };
        }),
      };
    }
    if (report === "top") {
      const ids = docs.map((doc) => doc.id);
      const items = ids.length ? await db.select().from(documentItems).where(inArray(documentItems.documentId, ids)) : [];
      const map = new Map<string, { name: string; qty: number; total: number }>();
      for (const item of items) {
        const current = map.get(item.name) ?? { name: item.name, qty: 0, total: 0 };
        current.qty = r2(current.qty + Number(item.qty));
        current.total = r2(current.total + Number(item.lineTotal));
        map.set(item.name, current);
      }
      return { report, from, to, rows: [...map.values()].sort((a, b) => b.qty - a.qty) };
    }
    return {
      report,
      from,
      to,
      rows: docs.map((doc) => ({
        id: doc.id,
        number: doc.number,
        date: iso(doc.createdAt),
        partyName: doc.partyName,
        paymentType: doc.paymentType,
        total: Number(doc.total),
        paid: Number(doc.paid),
        status: doc.status,
      })),
    };
  }

  if (type === "login") {
    const user = str(body.user);
    const pin = str(body.pin);
    if (!user || !pin) throw new Error("أدخل اسم الدخول والرمز");
    if (user !== (settingsRow.loginUser || "admin") || pin !== (settingsRow.loginPin || "1234")) {
      throw new Error("اسم الدخول أو الرمز غير صحيح");
    }
    return { user: settingsRow.cashierName || user };
  }

  if (type === "statement") {
    const kind = str(body.partyKind, "customer") === "supplier" ? "supplier" : "customer";
    const partyId = num(body.partyId);
    const from = str(body.from) || "2000-01-01";
    const to = str(body.to) || cairoDay();
    const party = kind === "customer"
      ? (await db.select().from(customers).where(eq(customers.id, partyId)))[0]
      : (await db.select().from(suppliers).where(eq(suppliers.id, partyId)))[0];
    if (!party) throw new Error("اختر الحساب");
    const docs = await db
      .select()
      .from(documents)
      .where(and(eq(documents.partyId, partyId), eq(documents.status, "saved")))
      .orderBy(documents.createdAt);
    const moves = await db.select().from(cashMoves).orderBy(cashMoves.createdAt);
    const rows: { date: string; label: string; debit: number; credit: number }[] = [];
    for (const doc of docs) {
      const day = cairoDay(new Date(doc.createdAt));
      const saleSide = doc.docType === "sale" || doc.docType === "saleReturn";
      const matches = kind === "customer" ? saleSide : !saleSide;
      if (!matches) continue;
      const total = Number(doc.total);
      const paid = Number(doc.paid);
      if (doc.docType === "sale" || doc.docType === "purchase") {
        rows.push({ date: day, label: `${doc.docType === "sale" ? "فاتورة بيع" : "فاتورة شراء"} #${doc.number}`, debit: kind === "customer" ? total : paid, credit: kind === "customer" ? paid : total });
      } else {
        rows.push({ date: day, label: `مرتجع #${doc.number}`, debit: kind === "customer" ? paid : total, credit: kind === "customer" ? total : paid });
      }
    }
    for (const move of moves) {
      if (move.partyName !== party.name) continue;
      if (move.source !== "receipt" && move.source !== "payment") continue;
      const day = cairoDay(new Date(move.createdAt));
      const amount = Number(move.amount);
      const moneyIn = move.direction === "in";
      rows.push({
        date: day,
        label: move.notes || (moneyIn ? "استلام نقدية" : "دفع نقدية"),
        debit: kind === "customer" ? (moneyIn ? 0 : amount) : moneyIn ? amount : 0,
        credit: kind === "customer" ? (moneyIn ? amount : 0) : moneyIn ? 0 : amount,
      });
    }
    rows.sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    const withBalance = rows.map((row) => {
      running = r2(running + row.debit - row.credit);
      return { ...row, balance: running };
    });
    const period = withBalance.filter((row) => row.date >= from && row.date <= to);
    const opening = r2(withBalance.filter((row) => row.date < from).reduce((sum, row) => sum + row.debit - row.credit, 0));
    return {
      partyName: party.name,
      from,
      to,
      opening,
      debit: r2(period.reduce((sum, row) => sum + row.debit, 0)),
      credit: r2(period.reduce((sum, row) => sum + row.credit, 0)),
      closing: r2(opening + period.reduce((sum, row) => sum + row.debit - row.credit, 0)),
      rows: period,
    };
  }

  if (type === "savePlan") {
    const customerId = num(body.customerId);
    const total = r2(num(body.total));
    const down = r2(num(body.downPayment));
    const months = Math.max(1, Math.round(num(body.months, settingsRow.installmentMonths || 4)));
    if (!customerId) throw new Error("اختر العميل");
    if (total <= 0) throw new Error("أدخل إجمالي التقسيط");
    if (down < 0 || down > total) throw new Error("المقدم غير صحيح");
    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
    if (!customer || customer.isSystem) throw new Error("التقسيط لعميل مسجل فقط، ليس للعميل النقدي");
    const monthly = r2((total - down) / months);
    await db.transaction(async (tx) => {
      const [maxRow] = await tx.select({ n: sql<number>`coalesce(max(${installmentPlans.number}), 6000)` }).from(installmentPlans);
      const number = Math.max(6000, Number(maxRow?.n || 6000)) + 1;
      const [plan] = await tx
        .insert(installmentPlans)
        .values({
          number,
          customerId,
          customerName: customer.name,
          total,
          downPayment: down,
          months,
          monthlyAmount: monthly,
          paidAmount: down,
          status: down >= total ? "مكتمل" : "جاري",
          notes: str(body.notes) || null,
          treasuryId: num(body.treasuryId) || null,
        })
        .returning();
      if (months > 0 && total > down) {
        const start = new Date();
        await tx.insert(installmentDues).values(
          Array.from({ length: months }, (_, index) => {
            const due = new Date(start);
            due.setMonth(due.getMonth() + index + 1);
            const amount = index === months - 1 ? r2(total - down - monthly * (months - 1)) : monthly;
            return { planId: plan.id, dueNo: index + 1, dueDate: cairoDay(due), amount, paid: 0, status: "مستحق" };
          }),
        );
      }
      if (down > 0) {
        await changeTreasury(tx, num(body.treasuryId), down, "receipt", customer.name, `مقدم تقسيط #${number}`, plan.id);
        await changePartyBalance(tx, "customer", customerId, -down);
      }
    });
    return { ok: true };
  }

  if (type === "collectDue") {
    const dueId = num(body.dueId);
    const treasuryId = num(body.treasuryId);
    await db.transaction(async (tx) => {
      const [due] = await tx.select().from(installmentDues).where(eq(installmentDues.id, dueId));
      if (!due) throw new Error("القسط غير موجود");
      const remain = r2(Number(due.amount) - Number(due.paid));
      if (remain <= 0) throw new Error("القسط مسدد");
      const [plan] = await tx.select().from(installmentPlans).where(eq(installmentPlans.id, due.planId));
      if (!plan) throw new Error("عقد التقسيط غير موجود");
      await changeTreasury(tx, treasuryId, remain, "receipt", plan.customerName, `قسط ${due.dueNo} من عقد #${plan.number}`, plan.id);
      await changePartyBalance(tx, "customer", plan.customerId, -remain);
      await tx.update(installmentDues).set({ paid: Number(due.amount), status: "مسدد" }).where(eq(installmentDues.id, due.id));
      const dues = await tx.select().from(installmentDues).where(eq(installmentDues.planId, plan.id));
      const paidAmount = r2(Number(plan.downPayment) + dues.reduce((sum, row) => sum + (row.id === due.id ? Number(due.amount) : Number(row.paid)), 0));
      const done = dues.every((row) => row.id === due.id || Number(row.paid) >= Number(row.amount));
      await tx.update(installmentPlans).set({ paidAmount, status: done ? "مكتمل" : "جاري" }).where(eq(installmentPlans.id, plan.id));
    });
    return { ok: true };
  }

  throw new Error("إجراء غير معروف");
}
