"use client";

import { useMemo, useState } from "react";
import { EXPENSE_CATEGORIES, JOBS, UNITS, stockOf } from "@/lib/constants";
import { formatDateTime, money, qtyText } from "@/lib/format";
import type { ProductDTO } from "@/lib/types";
import { Frame, Pager, Pick, fill, treasuryName, warehouseName, type ScreenProps } from "./ui";

const PAGE = 8;

export function ProductsScreen({ data, run, toast }: ScreenProps) {
  const empty = useMemo(() => blankProduct(data), [data]);
  const [form, setForm] = useState(empty);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [onlyActive, setOnlyActive] = useState(true);
  const rows = data.products.filter((product) => {
    if (onlyActive && !product.active) return false;
    return !q || product.name.includes(q) || product.code.includes(q);
  });
  const slice = rows.slice(page * PAGE, page * PAGE + PAGE);

  async function save() {
    try {
      await run({
        type: "saveProduct",
        ...form,
        stocks: data.warehouses.map((warehouse) => ({
          warehouseId: warehouse.id,
          qty: Number(form.stockMap[warehouse.id] || 0),
        })),
      });
      toast("تم حفظ الصنف", "ok");
      setForm(blankProduct(data));
    } catch {
      /* toasted */
    }
  }

  return (
    <Frame title="الأصناف — قرطاسية وكتب خارجية" extra={<button className="btn ghost" onClick={() => setForm(blankProduct(data))}>جديد</button>}>
      <div className="split form">
        <div className="card">
          <div className="fields">
            <label className="field short">كود<input className="num" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></label>
            <label className="field name">الاسم<input value={form.name} placeholder="اسم الصنف كاملًا" onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="field short">الوحدة
              <Pick value={form.unit} options={UNITS.map((unit) => ({ value: unit, label: unit }))} onChange={(value) => setForm({ ...form, unit: value })} />
            </label>
            <label className="field short">القسم
              <Pick value={form.categoryId} options={data.categories.map((row) => ({ value: row.id, label: row.name }))} onChange={(value) => setForm({ ...form, categoryId: Number(value) })} />
            </label>
            <label className="field">حد أدنى<input className="num" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value || 0) })} /></label>
            <label className="field">سعر البيع<input className="num" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value || 0) })} /></label>
            <label className="field">سعر الجملة<input className="num" value={form.wholesalePrice} onChange={(e) => setForm({ ...form, wholesalePrice: Number(e.target.value || 0) })} /></label>
            <label className="field">التكلفة<input className="num" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value || 0) })} /></label>
            <label className="field short">المرحلة
              <Pick
                value={form.stage}
                options={[{ value: "", label: "—" }, { value: "ابتدائي", label: "ابتدائي" }, { value: "إعدادي", label: "إعدادي" }, { value: "ثانوي", label: "ثانوي" }]}
                onChange={(value) => setForm({ ...form, stage: value })}
              />
            </label>
            <label className="field">الصف<input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} /></label>
            <label className="field">المادة<input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label>
            <label className="field">الناشر<input value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} /></label>
            {data.warehouses.map((warehouse) => (
              <label className="field" key={warehouse.id}>
                رصيد {warehouse.name}
                <input className="num" value={form.stockMap[warehouse.id] ?? 0} onChange={(e) => setForm({ ...form, stockMap: { ...form.stockMap, [warehouse.id]: Number(e.target.value || 0) } })} />
              </label>
            ))}
          </div>
          <div className="row-actions">
            <button className="btn" onClick={save}>حفظ الصنف</button>
            {form.id ? (
              <button
                className="btn danger"
                onClick={async () => {
                  if (!window.confirm("إيقاف الصنف عن البيع؟")) return;
                  try {
                    await run({ type: "deleteProduct", id: form.id });
                    toast("تم الإيقاف", "ok");
                    setForm(blankProduct(data));
                  } catch { /* toasted */ }
                }}
              >
                إيقاف
              </button>
            ) : null}
          </div>
        </div>
        <div className="card">
          <div className="toolbar">
            <input className="grow" placeholder="بحث بالاسم أو الكود" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
            <label><input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} /> النشط فقط</label>
          </div>
          <div className="table">
            <div className="thead" style={{ gridTemplateColumns: "78px minmax(260px,1.8fr) 110px 78px 78px 72px" }}>
              <span>كود</span><span>الصنف</span><span>القسم</span><span>بيع</span><span>جملة</span><span>الرصيد</span>
            </div>
            <div className="tbody" style={{ ["--rows" as string]: PAGE }}>
              {fill(slice, PAGE).map((product, index) => (
                <button
                  key={product?.id ?? index}
                  className={`trow ${form.id === product?.id ? "on" : ""}`}
                  style={{ gridTemplateColumns: "78px minmax(260px,1.8fr) 110px 78px 78px 72px", border: 0, background: "transparent", textAlign: "center" }}
                  onClick={() => product && setForm(fromProduct(product))}
                >
                  <span className="num">{product?.code ?? ""}</span>
                  <span>{product?.name ?? ""}</span>
                  <span>{data.categories.find((row) => row.id === product?.categoryId)?.name ?? ""}</span>
                  <span className="num">{product ? money(product.salePrice) : ""}</span>
                  <span className="num">{product ? money(product.wholesalePrice) : ""}</span>
                  <span className="num">{product ? qtyText(stockOf(product.stocks)) : ""}</span>
                </button>
              ))}
            </div>
          </div>
          <Pager page={page} pages={Math.max(1, Math.ceil(rows.length / PAGE))} setPage={setPage} />
        </div>
      </div>
    </Frame>
  );
}

type ProductForm = {
  id?: number;
  code: string;
  name: string;
  categoryId: number;
  unit: string;
  salePrice: number;
  wholesalePrice: number;
  costPrice: number;
  minStock: number;
  grade: string;
  subject: string;
  stage: string;
  publisher: string;
  active: boolean;
  stockMap: Record<number, number>;
};

function blankProduct(data: ScreenProps["data"]): ProductForm {
  return {
    code: "",
    name: "",
    categoryId: data.categories[0]?.id ?? 0,
    unit: "قطعة",
    salePrice: 0,
    wholesalePrice: 0,
    costPrice: 0,
    minStock: 5,
    grade: "",
    subject: "",
    stage: "",
    publisher: "",
    active: true,
    stockMap: Object.fromEntries(data.warehouses.map((row) => [row.id, 0])),
  };
}

function fromProduct(product: ProductDTO): ProductForm {
  return {
    id: product.id,
    code: product.code,
    name: product.name,
    categoryId: product.categoryId,
    unit: product.unit,
    salePrice: product.salePrice,
    wholesalePrice: product.wholesalePrice,
    costPrice: product.costPrice,
    minStock: product.minStock,
    grade: product.grade ?? "",
    subject: product.subject ?? "",
    stage: product.stage ?? "",
    publisher: product.publisher ?? "",
    active: product.active,
    stockMap: Object.fromEntries(product.stocks.map((row) => [row.warehouseId, row.qty])),
  };
}

export function CustomersScreen({ data, run, toast }: ScreenProps) {
  return (
    <PartyScreen
      title="العملاء"
      kind="customer"
      rows={data.customers.map((row) => ({ ...row, extra: row.priceType }))}
      run={run}
      toast={toast}
      treasuries={data.treasuries}
    />
  );
}

export function SuppliersScreen({ data, run, toast }: ScreenProps) {
  return (
    <PartyScreen
      title="الموردين"
      kind="supplier"
      rows={data.suppliers.map((row) => ({ ...row, priceType: "جملة", isSystem: false, extra: "" }))}
      run={run}
      toast={toast}
      treasuries={data.treasuries}
    />
  );
}

function PartyScreen({
  title,
  kind,
  rows,
  run,
  toast,
  treasuries,
}: {
  title: string;
  kind: "customer" | "supplier";
  rows: { id: number; code: string; name: string; phone: string | null; address: string | null; balance: number; priceType?: string; isSystem?: boolean; notes: string | null; extra?: string }[];
  run: ScreenProps["run"];
  toast: ScreenProps["toast"];
  treasuries: ScreenProps["data"]["treasuries"];
}) {
  const [form, setForm] = useState({ id: 0, code: "", name: "", phone: "", address: "", priceType: "قطاعي", notes: "" });
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [amount, setAmount] = useState(0);
  const [treasuryId, setTreasuryId] = useState(treasuries[0]?.id ?? 0);
  const filtered = rows.filter((row) => !q || row.name.includes(q) || row.code.includes(q) || (row.phone || "").includes(q));
  const slice = filtered.slice(page * PAGE, page * PAGE + PAGE);

  async function save() {
    try {
      await run({
        type: kind === "customer" ? "saveCustomer" : "saveSupplier",
        id: form.id || undefined,
        code: form.code,
        name: form.name,
        phone: form.phone,
        address: form.address,
        priceType: form.priceType,
        notes: form.notes,
      });
      toast("تم الحفظ", "ok");
      setForm({ id: 0, code: "", name: "", phone: "", address: "", priceType: "قطاعي", notes: "" });
    } catch { /* toasted */ }
  }

  async function settle() {
    if (!form.id || amount <= 0) return toast("اختر طرفًا وأدخل المبلغ", "err");
    try {
      await run({
        type: "cashMove",
        direction: kind === "customer" ? "in" : "out",
        amount,
        treasuryId,
        partyKind: kind,
        partyId: form.id,
        notes: kind === "customer" ? "تحصيل من العميل" : "سداد للمورد",
      });
      toast(kind === "customer" ? "تم التحصيل" : "تم السداد", "ok");
      setAmount(0);
    } catch { /* toasted */ }
  }

  return (
    <Frame title={title}>
      <div className="split form">
        <div className="card">
          <div className="fields">
            <label className="field short">كود<input className="num" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></label>
            <label className="field name">الاسم<input value={form.name} placeholder="الاسم الثلاثي" onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="field short">الهاتف<input className="num" value={form.phone} placeholder="01xxxxxxxxx" onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label className="field address">العنوان<input value={form.address} placeholder="الشارع، المنطقة، المدينة" onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
            {kind === "customer" && (
              <label className="field short">التسعير
                <Pick value={form.priceType} options={[{ value: "قطاعي", label: "قطاعي" }, { value: "جملة", label: "جملة" }]} onChange={(value) => setForm({ ...form, priceType: value })} />
              </label>
            )}
            <label className="field line">ملاحظات<input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
            <label className="field short">{kind === "customer" ? "تحصيل" : "سداد"}<input className="num" value={amount} onChange={(e) => setAmount(Number(e.target.value || 0))} /></label>
            <label className="field short">الخزينة
              <Pick value={treasuryId} options={treasuries.map((row) => ({ value: row.id, label: row.name }))} onChange={(value) => setTreasuryId(Number(value))} />
            </label>
          </div>
          <div className="row-actions">
            <button className="btn" onClick={save}>حفظ</button>
            <button className="btn ok" onClick={settle}>{kind === "customer" ? "تحصيل" : "سداد"}</button>
            {form.id ? (
              <button
                className="btn danger"
                onClick={async () => {
                  if (!window.confirm("حذف السجل؟")) return;
                  try {
                    await run({ type: kind === "customer" ? "deleteCustomer" : "deleteSupplier", id: form.id });
                    toast("تم الحذف", "ok");
                    setForm({ id: 0, code: "", name: "", phone: "", address: "", priceType: "قطاعي", notes: "" });
                  } catch { /* toasted */ }
                }}
              >
                حذف
              </button>
            ) : null}
          </div>
        </div>
        <div className="card">
          <input placeholder="بحث" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
          <div className="table">
            <div className="thead" style={{ gridTemplateColumns: "78px minmax(260px,1.8fr) 130px 90px 80px" }}>
              <span>كود</span><span>الاسم</span><span>الهاتف</span><span>الرصيد</span><span>النوع</span>
            </div>
            <div className="tbody" style={{ ["--rows" as string]: PAGE }}>
              {fill(slice, PAGE).map((row, index) => (
                <button
                  key={row?.id ?? index}
                  className={`trow ${form.id === row?.id ? "on" : ""}`}
                  style={{ gridTemplateColumns: "78px minmax(260px,1.8fr) 130px 90px 80px", border: 0, background: "transparent", textAlign: "center" }}
                  onClick={() => row && setForm({ id: row.id, code: row.code, name: row.name, phone: row.phone ?? "", address: row.address ?? "", priceType: row.priceType || "قطاعي", notes: row.notes ?? "" })}
                >
                  <span>{row?.code ?? ""}</span>
                  <span>{row?.name ?? ""}</span>
                  <span>{row?.phone ?? ""}</span>
                  <span className={`num ${row && row.balance > 0 ? "bad" : ""}`}>{row ? money(row.balance) : ""}</span>
                  <span>{row?.extra || (kind === "supplier" ? "مورد" : "")}</span>
                </button>
              ))}
            </div>
          </div>
          <Pager page={page} pages={Math.max(1, Math.ceil(filtered.length / PAGE))} setPage={setPage} />
        </div>
      </div>
    </Frame>
  );
}

export function EmployeesScreen({ data, run, toast }: ScreenProps) {
  const [form, setForm] = useState({ id: 0, code: "", name: "", jobTitle: "مبيعات", phone: "", salary: 0, hireDate: "", active: true });
  const [page, setPage] = useState(0);
  const [treasuryId, setTreasuryId] = useState(data.treasuries.find((row) => row.kind === "cash")?.id ?? 0);
  const rows = data.employees.filter((row) => row.active);
  const slice = rows.slice(page * PAGE, page * PAGE + PAGE);

  async function save() {
    try {
      await run({ type: "saveEmployee", ...form, id: form.id || undefined });
      toast("تم حفظ الموظف", "ok");
      setForm({ id: 0, code: "", name: "", jobTitle: "مبيعات", phone: "", salary: 0, hireDate: "", active: true });
    } catch { /* toasted */ }
  }

  return (
    <Frame title="إدارة الموظفين">
      <div className="split form">
        <div className="card">
          <div className="fields">
            <label className="field short">كود<input className="num" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></label>
            <label className="field name">الاسم<input value={form.name} placeholder="الاسم الثلاثي" onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="field short">الوظيفة
              <Pick value={form.jobTitle} options={JOBS.map((job) => ({ value: job, label: job }))} onChange={(value) => setForm({ ...form, jobTitle: value })} />
            </label>
            <label className="field short">الهاتف<input className="num" value={form.phone} placeholder="01xxxxxxxxx" onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label className="field">الراتب<input className="num" value={form.salary} onChange={(e) => setForm({ ...form, salary: Number(e.target.value || 0) })} /></label>
            <label className="field">التعيين<input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} /></label>
            <label className="field short">الخزينة
              <Pick value={treasuryId} options={data.treasuries.map((row) => ({ value: row.id, label: row.name }))} onChange={(value) => setTreasuryId(Number(value))} />
            </label>
          </div>
          <div className="row-actions">
            <button className="btn" onClick={save}>حفظ</button>
            <button
              className="btn warn"
              onClick={async () => {
                if (!form.id) return;
                try {
                  await run({ type: "paySalary", employeeId: form.id, treasuryId, amount: form.salary });
                  toast("تم صرف الراتب", "ok");
                } catch { /* toasted */ }
              }}
            >
              صرف الراتب
            </button>
          </div>
        </div>
        <div className="card">
          <div className="table">
            <div className="thead" style={{ gridTemplateColumns: "78px minmax(240px,1.6fr) 120px 120px 90px" }}>
              <span>كود</span><span>الاسم</span><span>الوظيفة</span><span>الهاتف</span><span>الراتب</span>
            </div>
            <div className="tbody" style={{ ["--rows" as string]: PAGE }}>
              {fill(slice, PAGE).map((row, index) => (
                <button key={row?.id ?? index} className={`trow ${form.id === row?.id ? "on" : ""}`} style={{ gridTemplateColumns: "78px minmax(240px,1.6fr) 120px 120px 90px", border: 0, background: "transparent", textAlign: "center" }} onClick={() => row && setForm({ id: row.id, code: row.code, name: row.name, jobTitle: row.jobTitle, phone: row.phone ?? "", salary: row.salary, hireDate: row.hireDate ?? "", active: row.active })}>
                  <span>{row?.code ?? ""}</span>
                  <span>{row?.name ?? ""}</span>
                  <span>{row?.jobTitle ?? ""}</span>
                  <span>{row?.phone ?? ""}</span>
                  <span className="num">{row ? money(row.salary) : ""}</span>
                </button>
              ))}
            </div>
          </div>
          <Pager page={page} pages={Math.max(1, Math.ceil(rows.length / PAGE))} setPage={setPage} />
        </div>
      </div>
    </Frame>
  );
}

export function WarehousesScreen({ data, run, toast }: ScreenProps) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [id, setId] = useState(0);
  const [isDefault, setIsDefault] = useState(false);
  return (
    <Frame title="المخازن">
      <div className="split" style={{ gridTemplateColumns: "280px minmax(0,1fr)" }}>
        <div className="card">
          <label className="field">اسم المخزن<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="field">ملاحظات<input value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          <label><input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} /> مخزن البيع الافتراضي</label>
          <button className="btn" onClick={async () => {
            try {
              await run({ type: "saveWarehouse", id: id || undefined, name, notes, isDefault });
              toast("تم حفظ المخزن", "ok");
              setName(""); setNotes(""); setId(0); setIsDefault(false);
            } catch { /* toasted */ }
          }}>حفظ</button>
        </div>
        <div className="card">
          <div className="table">
            <div className="thead" style={{ gridTemplateColumns: "1.2fr 80px 1fr 120px" }}>
              <span>المخزن</span><span>افتراضي</span><span>ملاحظات</span><span>قيمة التكلفة</span>
            </div>
            <div className="tbody" style={{ ["--rows" as string]: 6 }}>
              {fill(data.warehouses, 6).map((row, index) => {
                const value = row ? data.products.reduce((sum, product) => sum + product.costPrice * stockOf(product.stocks, row.id), 0) : 0;
                return (
                  <button key={row?.id ?? index} className="trow" style={{ gridTemplateColumns: "1.2fr 80px 1fr 120px", border: 0, background: "transparent", textAlign: "center" }} onClick={() => row && (setId(row.id), setName(row.name), setNotes(row.notes ?? ""), setIsDefault(row.isDefault))}>
                    <span>{row?.name ?? ""}</span>
                    <span>{row ? (row.isDefault ? "نعم" : "") : ""}</span>
                    <span>{row?.notes ?? ""}</span>
                    <span className="num">{row ? money(value) : ""}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

export function CashScreen({ data, run, toast, direction }: ScreenProps & { direction: "in" | "out" }) {
  const [amount, setAmount] = useState(0);
  const [treasuryId, setTreasuryId] = useState(data.treasuries.find((row) => row.kind === "cash")?.id ?? 0);
  const [partyId, setPartyId] = useState(0);
  const [notes, setNotes] = useState("");
  const [page, setPage] = useState(0);
  const parties = direction === "in" ? data.customers : data.suppliers;
  const moves = data.cashMoves.filter((row) => row.source === (direction === "in" ? "receipt" : "payment"));
  const slice = moves.slice(page * 7, page * 7 + 7);
  return (
    <Frame title={direction === "in" ? "إستلام نقدية" : "دفع نقدية"}>
      <div className="split form">
        <div className="card">
          <div className="fields">
          <label className="field short">المبلغ<input className="num" value={amount} onChange={(e) => setAmount(Number(e.target.value || 0))} /></label>
          <label className="field short">الخزينة
            <Pick value={treasuryId} options={data.treasuries.map((row) => ({ value: row.id, label: `${row.name} — ${money(row.balance)}` }))} onChange={(value) => setTreasuryId(Number(value))} />
          </label>
          <label className="field name">{direction === "in" ? "العميل" : "المورد"}
            <Pick value={partyId} options={[{ value: 0, label: "بدون طرف" }, ...parties.map((row) => ({ value: row.id, label: row.name }))]} onChange={(value) => setPartyId(Number(value))} />
          </label>
          <label className="field line">بيان<input value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          </div>
          <button className="btn ok" onClick={async () => {
            try {
              await run({
                type: "cashMove",
                direction,
                amount,
                treasuryId,
                partyKind: partyId ? (direction === "in" ? "customer" : "supplier") : "",
                partyId: partyId || undefined,
                notes,
              });
              toast("تم تسجيل الحركة", "ok");
              setAmount(0);
              setNotes("");
            } catch { /* toasted */ }
          }}>تسجيل</button>
        </div>
        <div className="card">
          <div className="table">
            <div className="thead" style={{ gridTemplateColumns: "120px 90px 1fr 1fr" }}>
              <span>التاريخ</span><span>المبلغ</span><span>الطرف</span><span>البيان</span>
            </div>
            <div className="tbody" style={{ ["--rows" as string]: 7 }}>
              {fill(slice, 7).map((row, index) => (
                <div className="trow" key={row?.id ?? index} style={{ gridTemplateColumns: "120px 90px 1fr 1fr" }}>
                  <span>{row ? formatDateTime(row.createdAt) : ""}</span>
                  <span className="num">{row ? money(row.amount) : ""}</span>
                  <span>{row?.partyName ?? ""}</span>
                  <span>{row?.notes ?? ""}</span>
                </div>
              ))}
            </div>
          </div>
          <Pager page={page} pages={Math.max(1, Math.ceil(moves.length / 7))} setPage={setPage} />
        </div>
      </div>
    </Frame>
  );
}

export function ExpensesScreen({ data, run, toast }: ScreenProps) {
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [treasuryId, setTreasuryId] = useState(data.treasuries[0]?.id ?? 0);
  const [page, setPage] = useState(0);
  const slice = data.expenses.slice(page * PAGE, page * PAGE + PAGE);
  return (
    <Frame title="المصروفات">
      <div className="split form">
        <div className="card">
          <div className="fields">
          <label className="field short">البند
            <Pick value={category} options={EXPENSE_CATEGORIES.map((item) => ({ value: item, label: item }))} onChange={setCategory} />
          </label>
          <label className="field short">المبلغ<input className="num" value={amount} onChange={(e) => setAmount(Number(e.target.value || 0))} /></label>
          <label className="field short">الخزينة
            <Pick value={treasuryId} options={data.treasuries.map((row) => ({ value: row.id, label: row.name }))} onChange={(value) => setTreasuryId(Number(value))} />
          </label>
          <label className="field line">بيان<input value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          </div>
          <button className="btn danger" onClick={async () => {
            try {
              await run({ type: "saveExpense", category, amount, treasuryId, notes });
              toast("تم تسجيل المصروف", "ok");
              setAmount(0); setNotes("");
            } catch { /* toasted */ }
          }}>تسجيل مصروف</button>
        </div>
        <div className="card">
          <div className="table">
            <div className="thead" style={{ gridTemplateColumns: "130px 90px 90px 1fr 70px" }}>
              <span>التاريخ</span><span>البند</span><span>المبلغ</span><span>بيان</span><span />
            </div>
            <div className="tbody" style={{ ["--rows" as string]: PAGE }}>
              {fill(slice, PAGE).map((row, index) => (
                <div className="trow" key={row?.id ?? index} style={{ gridTemplateColumns: "130px 90px 90px 1fr 70px" }}>
                  <span>{row ? formatDateTime(row.createdAt) : ""}</span>
                  <span>{row?.category ?? ""}</span>
                  <span className="num">{row ? money(row.amount) : ""}</span>
                  <span>{row?.notes ?? ""}</span>
                  <span>{row ? <button className="btn ghost" onClick={async () => { if (!window.confirm("حذف المصروف وإرجاع المبلغ للخزينة؟")) return; try { await run({ type: "deleteExpense", id: row.id }); toast("تم الحذف", "ok"); } catch { /* toasted */ } }}>حذف</button> : null}</span>
                </div>
              ))}
            </div>
          </div>
          <Pager page={page} pages={Math.max(1, Math.ceil(data.expenses.length / PAGE))} setPage={setPage} />
        </div>
      </div>
    </Frame>
  );
}

export function TreasuryScreen({ data, run, toast }: ScreenProps) {
  const cash = data.treasuries.find((row) => row.kind === "cash") ?? data.treasuries[0];
  const [treasuryId, setTreasuryId] = useState(cash?.id ?? 0);
  const [counted, setCounted] = useState(cash?.balance ?? 0);
  const [notes, setNotes] = useState("");
  const [page, setPage] = useState(0);
  const treasury = data.treasuries.find((row) => row.id === treasuryId);
  const moves = data.cashMoves.filter((row) => row.treasuryId === treasuryId);
  const slice = moves.slice(page * 6, page * 6 + 6);
  const diff = Number(counted || 0) - Number(treasury?.balance || 0);
  return (
    <Frame title="الخزينة">
      <div className="kpis">
        {data.treasuries.map((row) => (
          <div className="kpi" key={row.id}><span>{row.name}</span><b className="num">{money(row.balance)}</b></div>
        ))}
        <div className="kpi"><span>مديونية العملاء</span><b className="num">{money(data.stats.customerDebt)}</b></div>
        <div className="kpi"><span>مستحق الموردين</span><b className="num">{money(data.stats.supplierDebt)}</b></div>
      </div>
      <div className="split form">
        <div className="card">
          <div className="fields">
          <b className="sub">إقفال الوردية</b>
          <label className="field short">الخزينة
            <Pick value={treasuryId} options={data.treasuries.map((row) => ({ value: row.id, label: row.name }))} onChange={(value) => { const id = Number(value); setTreasuryId(id); setCounted(data.treasuries.find((row) => row.id === id)?.balance ?? 0); }} />
          </label>
          <div className="line" style={{ display: "flex", justifyContent: "space-between" }}><span>رصيد النظام</span><b className="num">{money(treasury?.balance)}</b></div>
          <label className="field">المبلغ المعدود<input className="num" value={counted} onChange={(e) => setCounted(Number(e.target.value || 0))} /></label>
          <div className="line" style={{ display: "flex", justifyContent: "space-between" }}><span>الفرق</span><b className={diff < 0 ? "bad" : "ok"}>{money(diff)}</b></div>
          <label className="field line">ملاحظة<input value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          </div>
          <button className="btn" onClick={async () => {
            if (!window.confirm("تأكيد إقفال الوردية وتسوية الفرق؟")) return;
            try {
              await run({ type: "closeShift", treasuryId, counted, notes });
              toast("تم إقفال الوردية", "ok");
            } catch { /* toasted */ }
          }}>إقفال الوردية</button>
        </div>
        <div className="card">
          <div className="table">
            <div className="thead" style={{ gridTemplateColumns: "130px 70px 80px 90px 1fr" }}>
              <span>التاريخ</span><span>النوع</span><span>المبلغ</span><span>المصدر</span><span>بيان</span>
            </div>
            <div className="tbody" style={{ ["--rows" as string]: 6 }}>
              {fill(slice, 6).map((row, index) => (
                <div className="trow" key={row?.id ?? index} style={{ gridTemplateColumns: "130px 70px 80px 90px 1fr" }}>
                  <span>{row ? formatDateTime(row.createdAt) : ""}</span>
                  <span>{row ? (row.direction === "in" ? "داخل" : "خارج") : ""}</span>
                  <span className="num">{row ? money(row.amount) : ""}</span>
                  <span>{row?.source ?? ""}</span>
                  <span>{row?.notes || row?.partyName || ""}</span>
                </div>
              ))}
            </div>
          </div>
          <Pager page={page} pages={Math.max(1, Math.ceil(moves.length / 6))} setPage={setPage} />
        </div>
      </div>
    </Frame>
  );
}

export function AttendanceScreen({ data, run, toast }: ScreenProps) {
  const today = data.attendance.filter((row) => row.day === new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
  async function mark(employeeId: number, action: string) {
    try {
      await run({ type: "attendance", employeeId, action });
      toast("تم تسجيل الحركة", "ok");
    } catch { /* toasted */ }
  }
  return (
    <Frame title="حضور وانصراف">
      <div className="table">
        <div className="thead" style={{ gridTemplateColumns: "1.2fr 120px 80px 80px 90px 220px" }}>
          <span>الموظف</span><span>الوظيفة</span><span>حضور</span><span>انصراف</span><span>الحالة</span><span />
        </div>
        <div className="tbody" style={{ ["--rows" as string]: 6 }}>
          {fill(data.employees.filter((row) => row.active), 6).map((employee, index) => {
            const row = employee ? today.find((item) => item.employeeId === employee.id) : undefined;
            return (
              <div className="trow" key={employee?.id ?? index} style={{ gridTemplateColumns: "1.2fr 120px 80px 80px 90px 220px" }}>
                <span>{employee?.name ?? ""}</span>
                <span>{employee?.jobTitle ?? ""}</span>
                <span className="num">{row?.checkIn ?? ""}</span>
                <span className="num">{row?.checkOut ?? ""}</span>
                <span>{row?.status ?? "—"}</span>
                <span>
                  {employee ? (
                    <span className="row-actions">
                      <button className="btn ok" onClick={() => mark(employee.id, "in")}>حضور</button>
                      <button className="btn" onClick={() => mark(employee.id, "out")}>انصراف</button>
                      <button className="btn ghost" onClick={() => mark(employee.id, "leave")}>إجازة</button>
                    </span>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Frame>
  );
}

export function TransfersScreen({ data, run, toast }: ScreenProps) {
  const [fromWarehouseId, setFrom] = useState(data.warehouses[1]?.id ?? data.warehouses[0]?.id ?? 0);
  const [toWarehouseId, setTo] = useState(data.warehouses[0]?.id ?? 0);
  const [productId, setProductId] = useState(data.products[0]?.id ?? 0);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<{ productId: number; name: string; qty: number }[]>([]);
  const [page, setPage] = useState(0);
  const slice = data.transfers.slice(page * 5, page * 5 + 5);
  return (
    <Frame title="تحويلات مخازن">
      <div className="split form">
        <div className="card">
          <div className="fields">
          <label className="field short">من
            <Pick value={fromWarehouseId} options={data.warehouses.map((row) => ({ value: row.id, label: row.name }))} onChange={(value) => setFrom(Number(value))} />
          </label>
          <label className="field short">إلى
            <Pick value={toWarehouseId} options={data.warehouses.map((row) => ({ value: row.id, label: row.name }))} onChange={(value) => setTo(Number(value))} />
          </label>
          <label className="field name">الصنف
            <Pick value={productId} options={data.products.filter((row) => row.active).map((row) => ({ value: row.id, label: row.name }))} onChange={(value) => setProductId(Number(value))} />
          </label>
          <label className="field">الكمية<input className="num" value={qty} onChange={(e) => setQty(Number(e.target.value || 0))} /></label>
          <div className="row-actions">
            <button className="btn ghost" onClick={() => {
              const product = data.products.find((row) => row.id === productId);
              if (!product || qty <= 0) return;
              setLines((prev) => [...prev, { productId, name: product.name, qty }]);
            }}>إضافة</button>
            <button className="btn" onClick={async () => {
              try {
                await run({ type: "saveTransfer", fromWarehouseId, toWarehouseId, notes, lines });
                toast("تم التحويل", "ok");
                setLines([]);
                setNotes("");
              } catch { /* toasted */ }
            }}>تنفيذ التحويل</button>
          </div>
          <label className="field">بيان<input value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          {lines.slice(0, 4).map((line, index) => (
            <div key={`${line.productId}-${index}`} className="sub" style={{ display: "flex", justifyContent: "space-between", minWidth: 180 }}>
              <span>{line.name}</span><b>{line.qty}</b>
            </div>
          ))}
          </div>
        </div>
        <div className="card">
          <div className="table">
            <div className="thead" style={{ gridTemplateColumns: "70px 120px 1fr 1fr" }}>
              <span>رقم</span><span>التاريخ</span><span>من</span><span>إلى</span>
            </div>
            <div className="tbody" style={{ ["--rows" as string]: 5 }}>
              {fill(slice, 5).map((row, index) => (
                <div className="trow" key={row?.id ?? index} style={{ gridTemplateColumns: "70px 120px 1fr 1fr" }}>
                  <span className="num">{row?.number ?? ""}</span>
                  <span>{row ? formatDateTime(row.createdAt) : ""}</span>
                  <span>{row ? warehouseName(data, row.fromWarehouseId) : ""}</span>
                  <span>{row ? warehouseName(data, row.toWarehouseId) : ""}</span>
                </div>
              ))}
            </div>
          </div>
          <Pager page={page} pages={Math.max(1, Math.ceil(data.transfers.length / 5))} setPage={setPage} />
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>آخر تحويل: {slice[0]?.items?.map((item) => `${item.name} × ${item.qty}`).join("، ")}</p>
        </div>
      </div>
    </Frame>
  );
}

export function unusedTreasuryName(data: ScreenProps["data"], id: number) {
  return treasuryName(data, id);
}
