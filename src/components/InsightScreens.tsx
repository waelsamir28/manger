"use client";

import { useState } from "react";
import { cairoDay, formatDate, money, qtyText, sourceLabel } from "@/lib/format";
import type { ScreenId } from "@/lib/types";
import { Frame, Pager, Pick, fill, treasuryName, type ScreenProps } from "./ui";

const REPORTS: { id: string; label: string }[] = [
  { id: "sales", label: "مبيعات الفترة" },
  { id: "purchases", label: "مشتريات الفترة" },
  { id: "profit", label: "أرباح تقديرية" },
  { id: "top", label: "الأكثر مبيعًا" },
  { id: "stock", label: "جرد المخزون" },
  { id: "lowStock", label: "نواقص المخزون" },
  { id: "customers", label: "أرصدة العملاء" },
  { id: "suppliers", label: "أرصدة الموردين" },
  { id: "cash", label: "حركة الخزينة" },
  { id: "expenses", label: "المصروفات" },
  { id: "attendance", label: "الحضور" },
  { id: "itemMove", label: "حركة صنف" },
];

export function StatsScreen({ data, open }: ScreenProps) {
  const max = Math.max(1, ...data.stats.salesByDay.map((row) => row.total));
  return (
    <Frame title="إحصائيات المحل" extra={<button className="btn ghost" onClick={() => open("reports")}>التقارير</button>}>
      <div className="stats-grid">
        <div className="kpis">
          <Kpi label="مبيعات اليوم" value={money(data.stats.todaySales)} />
          <Kpi label="فواتير اليوم" value={String(data.stats.todayInvoices)} />
          <Kpi label="ربح اليوم" value={money(data.stats.todayProfit)} />
          <Kpi label="مبيعات الشهر" value={money(data.stats.monthSales)} />
          <Kpi label="مشتريات الشهر" value={money(data.stats.monthPurchases)} />
          <Kpi label="قيمة المخزون" value={money(data.stats.stockValue)} />
        </div>
        <div className="card">
          <b>مبيعات آخر ٧ أيام</b>
          <div className="bars">
            {data.stats.salesByDay.map((row) => (
              <div className="bar" key={row.day}>
                <i style={{ height: `${Math.max(4, (row.total / max) * 100)}%` }} />
                <em>{row.day.slice(5)}</em>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <b>الأكثر مبيعًا هذا الشهر</b>
          {data.stats.topProducts.slice(0, 5).map((row) => (
            <div key={row.name} className="line" style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span>{row.name}</span>
              <b>{qtyText(row.qty)} · {money(row.total)}</b>
            </div>
          ))}
          {!data.stats.topProducts.length && <p className="muted">لا توجد مبيعات بعد.</p>}
        </div>
        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <b>نواقص تحتاج طلبًا قبل الزحمة</b>
          <div className="tips">
            {data.stats.lowStock.slice(0, 6).map((row) => (
              <p key={row.id}>{row.name} — المتاح {qtyText(row.qty)} / الحد {row.minStock}</p>
            ))}
            {!data.stats.lowStock.length && <p>المخزون فوق الحد الأدنى.</p>}
          </div>
        </div>
      </div>
    </Frame>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="kpi">
      <span>{label}</span>
      <b className="num">{value}</b>
    </div>
  );
}

export function ReportsScreen({ data, run, toast }: ScreenProps) {
  const today = cairoDay();
  const [report, setReport] = useState("sales");
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [productId, setProductId] = useState(data.products[0]?.id ?? 0);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [page, setPage] = useState(0);
  const [loaded, setLoaded] = useState("");

  async function load(next = report) {
    try {
      const extra = await run({ type: "report", report: next, from, to, productId });
      const list = Array.isArray(extra?.rows) ? (extra.rows as Record<string, unknown>[]) : [];
      setRows(list);
      setPage(0);
      setLoaded(next);
    } catch {
      /* toasted */
    }
  }

  const slice = rows.slice(page * 8, page * 8 + 8);
  const columns = columnsFor(loaded || report);

  return (
    <Frame title="التقارير" extra={<button className="btn" onClick={() => load()}>عرض</button>}>
      <div className="split" style={{ gridTemplateColumns: "190px minmax(0,1fr)" }}>
        <div className="card" style={{ gap: 4 }}>
          {REPORTS.map((item) => (
            <button key={item.id} className={`btn ${report === item.id ? "" : "ghost"}`} onClick={() => { setReport(item.id); setRows([]); }}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="card">
          <div className="toolbar">
            <label className="field short">من<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
            <label className="field short">إلى<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
            {report === "itemMove" && (
              <label className="field name">الصنف
                <Pick value={productId} options={data.products.filter((row) => row.active).map((row) => ({ value: row.id, label: row.name }))} onChange={(value) => setProductId(Number(value))} />
              </label>
            )}
            <button className="btn ghost" onClick={() => window.print()}>طباعة الشاشة</button>
          </div>
          <div className="table">
            <div className="thead" style={{ gridTemplateColumns: columns.template }}>
              {columns.headers.map((header) => <span key={header}>{header}</span>)}
            </div>
            <div className="tbody" style={{ ["--rows" as string]: 8 }}>
              {fill(slice, 8).map((row, index) => (
                <div className="trow" key={index} style={{ gridTemplateColumns: columns.template }}>
                  {columns.cells(row).map((cell, cellIndex) => <span key={cellIndex} className={cellIndex ? "num" : ""}>{cell}</span>)}
                </div>
              ))}
            </div>
          </div>
          <Pager page={page} pages={Math.max(1, Math.ceil(rows.length / 8))} setPage={setPage} />
          <b>عدد السجلات: {rows.length} {loaded ? "" : "— اضغط عرض"}</b>
        </div>
      </div>
    </Frame>
  );
}

function columnsFor(report: string) {
  if (report === "profit") {
    return {
      template: "70px 120px 1fr 90px 90px 90px",
      headers: ["رقم", "التاريخ", "الطرف", "الإجمالي", "التكلفة", "الربح"],
      cells: (row: Record<string, unknown> | null) => row ? [String(row.number), formatDate(String(row.date)), String(row.partyName), money(Number(row.total)), money(Number(row.cost)), money(Number(row.profit))] : ["", "", "", "", "", ""],
    };
  }
  if (report === "top") {
    return {
      template: "1.4fr 80px 100px",
      headers: ["الصنف", "الكمية", "القيمة"],
      cells: (row: Record<string, unknown> | null) => row ? [String(row.name), qtyText(Number(row.qty)), money(Number(row.total))] : ["", "", ""],
    };
  }
  if (report === "stock" || report === "lowStock") {
    return {
      template: report === "stock" ? "70px 1.4fr 70px 80px 90px" : "70px 1.4fr 70px 70px",
      headers: report === "stock" ? ["كود", "الصنف", "الرصيد", "التكلفة", "القيمة"] : ["كود", "الصنف", "الرصيد", "الحد"],
      cells: (row: Record<string, unknown> | null) => {
        if (!row) return report === "stock" ? ["", "", "", "", ""] : ["", "", "", ""];
        return report === "stock"
          ? [String(row.code ?? ""), String(row.name), qtyText(Number(row.qty)), money(Number(row.cost)), money(Number(row.value))]
          : [String(row.code ?? ""), String(row.name), qtyText(Number(row.qty)), String(row.minStock ?? "")];
      },
    };
  }
  if (report === "customers" || report === "suppliers") {
    return {
      template: "70px 1.3fr 110px 90px",
      headers: ["كود", "الاسم", "الهاتف", "الرصيد"],
      cells: (row: Record<string, unknown> | null) => row ? [String(row.code), String(row.name), String(row.phone ?? ""), money(Number(row.balance))] : ["", "", "", ""],
    };
  }
  if (report === "cash") {
    return {
      template: "130px 70px 80px 90px 1fr",
      headers: ["التاريخ", "الاتجاه", "المبلغ", "المصدر", "بيان"],
      cells: (row: Record<string, unknown> | null) => row ? [formatDate(String(row.date)), row.direction === "in" ? "داخل" : "خارج", money(Number(row.amount)), sourceLabel(String(row.source)), String(row.notes || row.partyName || "")] : ["", "", "", "", ""],
    };
  }
  if (report === "expenses") {
    return {
      template: "130px 90px 90px 1fr",
      headers: ["التاريخ", "البند", "المبلغ", "بيان"],
      cells: (row: Record<string, unknown> | null) => row ? [formatDate(String(row.date)), String(row.category), money(Number(row.amount)), String(row.notes ?? "")] : ["", "", "", ""],
    };
  }
  if (report === "attendance") {
    return {
      template: "80px 110px 80px 80px 80px",
      headers: ["اليوم", "موظف", "حضور", "انصراف", "الحالة"],
      cells: (row: Record<string, unknown> | null) => row ? [String(row.day), String(row.employeeId), String(row.checkIn ?? ""), String(row.checkOut ?? ""), String(row.status)] : ["", "", "", "", ""],
    };
  }
  if (report === "itemMove") {
    return {
      template: "140px 80px 90px 1fr",
      headers: ["التاريخ", "الكمية", "المخزن", "المصدر"],
      cells: (row: Record<string, unknown> | null) => row ? [formatDate(String(row.date)), qtyText(Number(row.qtyDelta)), String(row.warehouseId), sourceLabel(String(row.source))] : ["", "", "", ""],
    };
  }
  return {
    template: "70px 120px 1.2fr 80px 90px 80px",
    headers: ["رقم", "التاريخ", "الطرف", "الدفع", "الإجمالي", "المدفوع"],
    cells: (row: Record<string, unknown> | null) => row ? [String(row.number ?? ""), formatDate(String(row.date)), String(row.partyName ?? ""), String(row.paymentType ?? ""), money(Number(row.total || 0)), money(Number(row.paid || 0))] : ["", "", "", "", "", ""],
  };
}

export function PricesScreen({ data, toast }: ScreenProps) {
  const [catId, setCatId] = useState(0);
  const [stage, setStage] = useState("الكل");
  const [page, setPage] = useState(0);
  const rows = data.products.filter((product) => product.active && (!catId || product.categoryId === catId) && (stage === "الكل" || product.stage === stage));
  const slice = rows.slice(page * 8, page * 8 + 8);
  return (
    <Frame
      title="بيان أسعار"
      extra={<button className="btn" onClick={() => { toast("استخدم طباعة المتصفح لتعليق القائمة في المحل", "ok"); window.print(); }}>طباعة</button>}
    >
      <div className="toolbar">
        <label className="field short">القسم
          <Pick value={catId} options={[{ value: 0, label: "كل الأقسام" }, ...data.categories.map((row) => ({ value: row.id, label: row.name }))]} onChange={(value) => { setCatId(Number(value)); setPage(0); }} />
        </label>
        <label className="field short">المرحلة
          <Pick value={stage} options={["الكل", "ابتدائي", "إعدادي", "ثانوي"].map((item) => ({ value: item, label: item }))} onChange={(value) => { setStage(value); setPage(0); }} />
        </label>
        <span className="muted">سعر الجملة للمدارس = ٩٠٪ من سعر الرف، ويمكن تعديله من الأصناف.</span>
      </div>
      <div className="table">
        <div className="thead" style={{ gridTemplateColumns: "70px 1.5fr 90px 80px 80px 70px" }}>
          <span>كود</span><span>الصنف</span><span>القسم</span><span>قطاعي</span><span>جملة</span><span>الرصيد</span>
        </div>
        <div className="tbody" style={{ ["--rows" as string]: 8 }}>
          {fill(slice, 8).map((row, index) => (
            <div className="trow" key={row?.id ?? index} style={{ gridTemplateColumns: "70px 1.5fr 90px 80px 80px 70px" }}>
              <span className="num">{row?.code ?? ""}</span>
              <span>{row?.name ?? ""}</span>
              <span>{data.categories.find((cat) => cat.id === row?.categoryId)?.name ?? ""}</span>
              <span className="num">{row ? money(row.salePrice) : ""}</span>
              <span className="num">{row ? money(row.wholesalePrice) : ""}</span>
              <span className="num">{row ? qtyText(row.stocks.reduce((sum, item) => sum + item.qty, 0)) : ""}</span>
            </div>
          ))}
        </div>
      </div>
      <Pager page={page} pages={Math.max(1, Math.ceil(rows.length / 8))} setPage={setPage} />
    </Frame>
  );
}

export function AccountsScreen({ data }: ScreenProps) {
  const [page, setPage] = useState(0);
  const customers = data.customers.filter((row) => !row.isSystem);
  const sliceC = customers.slice(page * 6, page * 6 + 6);
  const sliceS = data.suppliers.slice(page * 6, page * 6 + 6);
  return (
    <Frame title="الحسابات">
      <div className="kpis">
        <Kpi label="ديون العملاء" value={money(data.stats.customerDebt)} />
        <Kpi label="مستحق الموردين" value={money(data.stats.supplierDebt)} />
        {data.treasuries.map((row) => <Kpi key={row.id} label={row.name} value={money(row.balance)} />)}
      </div>
      <div className="split" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="card">
          <b>العملاء — الرصيد الموجب يعني مدين</b>
          <div className="table">
            <div className="thead" style={{ gridTemplateColumns: "1fr 90px" }}><span>العميل</span><span>الرصيد</span></div>
            <div className="tbody" style={{ ["--rows" as string]: 6 }}>
              {fill(sliceC, 6).map((row, index) => (
                <div className="trow" key={row?.id ?? index} style={{ gridTemplateColumns: "1fr 90px" }}>
                  <span>{row?.name ?? ""}</span>
                  <span className={`num ${row && row.balance > 0 ? "bad" : ""}`}>{row ? money(row.balance) : ""}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="card">
          <b>الموردين — الرصيد الموجب يعني مستحق لهم</b>
          <div className="table">
            <div className="thead" style={{ gridTemplateColumns: "1fr 90px" }}><span>المورد</span><span>الرصيد</span></div>
            <div className="tbody" style={{ ["--rows" as string]: 6 }}>
              {fill(sliceS, 6).map((row, index) => (
                <div className="trow" key={row?.id ?? index} style={{ gridTemplateColumns: "1fr 90px" }}>
                  <span>{row?.name ?? ""}</span>
                  <span className="num">{row ? money(row.balance) : ""}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Pager page={page} pages={Math.max(1, Math.ceil(Math.max(customers.length, data.suppliers.length) / 6))} setPage={setPage} />
    </Frame>
  );
}

const THEMES = [
  { id: "classic", name: "أزرق كلاسيكي", color: "#2f62e4" },
  { id: "night", name: "ليلي", color: "#0f172a" },
  { id: "library", name: "أخضر مكتبة", color: "#0f766e" },
  { id: "royal", name: "كحلي ذهبي", color: "#1e3a5f" },
  { id: "sand", name: "بيج قرطاسية", color: "#b45309" },
];

export function SettingsScreen({ data, run, toast }: ScreenProps) {
  const [form, setForm] = useState(data.settings);
  const [pin, setPin] = useState("");
  return (
    <Frame title="الإعدادات" extra={<button className="btn" onClick={async () => { try { await run({ type: "saveSettings", ...form, loginPin: pin }); toast("تم حفظ الإعدادات", "ok"); setPin(""); } catch { /* toasted */ } }}>حفظ</button>}>
      <div className="card">
        <div className="fields">
          <label className="field name">اسم المحل<input value={form.storeName} placeholder="قرطاسية ومكتبة النور" onChange={(e) => setForm({ ...form, storeName: e.target.value })} /></label>
          <label className="field name">الكاشير<input value={form.cashierName} placeholder="الاسم الثلاثي" onChange={(e) => setForm({ ...form, cashierName: e.target.value })} /></label>
          <label className="field short">الضريبة %<input className="num" value={form.taxPercent} onChange={(e) => setForm({ ...form, taxPercent: Number(e.target.value || 0) })} /></label>
          <label className="field line">النشاط<input value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} /></label>
          <label className="field short">الهاتف<input className="num" value={form.phone} placeholder="01xxxxxxxxx" onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label className="field short">هاتف آخر<input className="num" value={form.phone2 ?? ""} onChange={(e) => setForm({ ...form, phone2: e.target.value })} /></label>
          <label className="field name">الموقع<input value={form.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} /></label>
          <label className="field name">البريد<input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label className="field address">العنوان<input value={form.address ?? ""} placeholder="الشارع، المنطقة، المدينة" onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
          <label className="field line">ملاحظة الفاتورة<input value={form.footerNote ?? ""} onChange={(e) => setForm({ ...form, footerNote: e.target.value })} /></label>
          <label className="field short">العملة<input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></label>
          <label className="field short">الموسم<input value={form.season} placeholder="2026-2027" onChange={(e) => setForm({ ...form, season: e.target.value })} /></label>
          <label className="field short">شهور التقسيط<input className="num" value={form.installmentMonths} onChange={(e) => setForm({ ...form, installmentMonths: Number(e.target.value || 1) })} /></label>
          <label className="field short">مقدم %<input className="num" value={form.downPercent} onChange={(e) => setForm({ ...form, downPercent: Number(e.target.value || 0) })} /></label>
          <label className="field short">غرامة تأخير<input className="num" value={form.lateFee} onChange={(e) => setForm({ ...form, lateFee: Number(e.target.value || 0) })} /></label>
          <label className="field short">دفع افتراضي
            <Pick value={form.defaultPayment} options={[{ value: "نقدي", label: "نقدي" }, { value: "آجل", label: "آجل" }, { value: "فيزا", label: "فيزا" }]} onChange={(value) => setForm({ ...form, defaultPayment: value })} />
          </label>
          <label className="checkline"><input type="checkbox" checked={form.autoFillPaid} onChange={(e) => setForm({ ...form, autoFillPaid: e.target.checked })} /> تعبئة المدفوع تلقائيًا</label>
          <label className="checkline"><input type="checkbox" checked={form.allowNegative} onChange={(e) => setForm({ ...form, allowNegative: e.target.checked })} /> السماح بالبيع عند نقص المخزون</label>
          <label className="field short">اسم الدخول<input value={form.loginUser} onChange={(e) => setForm({ ...form, loginUser: e.target.value })} /></label>
          <label className="field short">رمز جديد<input type="password" value={pin} placeholder="اتركه فارغًا للإبقاء" onChange={(e) => setPin(e.target.value)} /></label>
        </div>
        <div className="themes">
          {THEMES.map((item) => (
            <button key={item.id} type="button" className={`theme-swatch ${form.theme === item.id ? "on" : ""}`} onClick={() => { setForm({ ...form, theme: item.id }); document.documentElement.dataset.theme = item.id; }}>
              <i style={{ background: item.color }} />
              <span>{item.name}</span>
            </button>
          ))}
        </div>
        <p className="sub">الكتب والكراسات والأقلام للبيع فقط، من غير استبدال أو استيراد.</p>
      </div>
    </Frame>
  );
}

export function MaintenanceScreen({ data, toast, open }: ScreenProps) {
  function backup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `noor-backup-${cairoDay()}.json`;
    link.click();
    toast("تم تنزيل النسخة", "ok");
  }
  return (
    <Frame title="الصيانة" extra={<span className="row-actions"><button className="btn ghost" onClick={() => open("install")}>خطوات التثبيت</button><button className="btn" onClick={backup}>تنزيل نسخة JSON</button></span>}>
      <div className="kpis">
        <Kpi label="الأصناف" value={String(data.products.length)} />
        <Kpi label="العملاء" value={String(data.customers.length)} />
        <Kpi label="الفواتير المحفوظة" value={String(data.documents.filter((row) => row.status === "saved").length)} />
        <Kpi label="المعلقة" value={String(data.stats.suspended)} />
        <Kpi label="قيمة المخزون" value={money(data.stats.stockValue)} />
        <Kpi label="الخزينة" value={money(data.treasuries.reduce((sum, row) => sum + row.balance, 0))} />
      </div>
      <div className="card">
        <b>حالة النظام</b>
        <p style={{ margin: 0 }}>قاعدة البيانات متصلة. المستخدم الحالي: {data.settings.cashierName}. آخر رقم مبيعات: {data.nextNumbers.sale - 1 || "—"}. خزينة: {treasuryName(data, data.treasuries[0]?.id)}.</p>
        <p className="muted" style={{ margin: 0 }}>النسخ الكامل لقاعدة PostgreSQL يبقى عند مسؤول الجهاز. ملف JSON يكفي لمراجعة البيانات، وليس لاسترجاعها داخل البرنامج.</p>
      </div>
    </Frame>
  );
}

export function ContactScreen({ data, run, toast }: ScreenProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [body, setBody] = useState("");
  const [page, setPage] = useState(0);
  const slice = data.messages.slice(page * 4, page * 4 + 4);
  return (
    <Frame title="اتصل بنا">
      <div className="split form">
        <div className="card">
          <b>{data.settings.storeName}</b>
          <p style={{ margin: 0 }}>{data.settings.activity}</p>
          <p style={{ margin: 0 }}>{data.settings.address}</p>
          <p style={{ margin: 0 }}>{data.settings.phone}</p>
          <p style={{ margin: 0 }}>{data.settings.email}</p>
          <p style={{ margin: 0 }}>{data.settings.website}</p>
          <label className="field name">الاسم<input value={name} placeholder="الاسم الثلاثي" onChange={(e) => setName(e.target.value)} /></label>
          <label className="field short">الهاتف<input className="num" value={phone} placeholder="01xxxxxxxxx" onChange={(e) => setPhone(e.target.value)} /></label>
          <label className="field line">الرسالة<input value={body} onChange={(e) => setBody(e.target.value)} /></label>
          <button className="btn" onClick={async () => {
            try {
              await run({ type: "saveMessage", name, phone, body });
              toast("تم تسجيل الرسالة", "ok");
              setName(""); setPhone(""); setBody("");
            } catch { /* toasted */ }
          }}>تسجيل رسالة</button>
        </div>
        <div className="card">
          <div className="table">
            <div className="thead" style={{ gridTemplateColumns: "120px 110px 1fr 60px" }}>
              <span>التاريخ</span><span>الاسم</span><span>الرسالة</span><span />
            </div>
            <div className="tbody" style={{ ["--rows" as string]: 4 }}>
              {fill(slice, 4).map((row, index) => (
                <div className="trow" key={row?.id ?? index} style={{ gridTemplateColumns: "120px 110px 1fr 60px" }}>
                  <span>{row ? formatDate(row.createdAt) : ""}</span>
                  <span>{row?.name ?? ""}</span>
                  <span>{row?.body ?? ""}</span>
                  <span>{row ? <button className="btn ghost" onClick={async () => { try { await run({ type: "deleteMessage", id: row.id }); } catch { /* toasted */ } }}>حذف</button> : null}</span>
                </div>
              ))}
            </div>
          </div>
          <Pager page={page} pages={Math.max(1, Math.ceil(data.messages.length / 4))} setPage={setPage} />
        </div>
      </div>
    </Frame>
  );
}

const INSTALL_STEPS = [
  { n: "1", title: "جهّز جهاز الكاشير", text: "ويندوز 10 أو 11، شاشة 1366×768 على الأقل، وطابعة حرارية 80 مم كطابعة افتراضية." },
  { n: "2", title: "ثبّت PostgreSQL", text: "نسخة 16 على نفس الجهاز، المنفذ 5432، والمستخدم postgres. البيانات تفضل محلية ومش على الإنترنت." },
  { n: "3", title: "انسخ البرنامج", text: "حط المجلد في C:\\NoorSales. أول تشغيل ينشئ الجداول والأصناف والعملاء لوحده." },
  { n: "4", title: "غلّف النافذة", text: "استخدم Electron عشان البرنامج يفتح كنافذة سطح مكتب من غير شريط المتصفح، وفي وضع ملء الشاشة." },
  { n: "5", title: "اعمل ملف التثبيت", text: "Inno Setup يطلع Setup.exe: يركب قاعدة البيانات، ينسخ البرنامج، ويعمل اختصار على سطح المكتب." },
  { n: "6", title: "أول تشغيل", text: "من الإعدادات غيّر اسم المحل والتليفون والضريبة. جرّب فاتورة وطباعة قبل ما تسلّم الكاشير." },
  { n: "7", title: "نسخة يومية", text: "اعمل نسخة من قاعدة app_db كل يوم قبل القفل. ملف JSON من الصيانة للمراجعة بس، مش للاسترجاع." },
  { n: "8", title: "تحديث آمن", text: "قبل أي تحديث خد نسخة، اقفل البرنامج، استبدل الملفات، وافتحه تاني. متمسحش مجلد البيانات." },
];

export function DesktopInstallScreen({ open }: ScreenProps) {
  return (
    <Frame title="تثبيت سطح المكتب" extra={<button className="btn ghost" onClick={() => open("settings")}>الإعدادات</button>}>
      <div className="kpis">
        <Kpi label="الشكل النهائي" value="ملف Setup.exe" />
        <Kpi label="النافذة" value="Electron" />
        <Kpi label="البيانات" value="PostgreSQL محلي" />
        <Kpi label="الاختصار" value="سطح المكتب" />
        <Kpi label="الطباعة" value="حرارية 80 مم" />
        <Kpi label="الوضع" value="ملء الشاشة" />
      </div>
      <div className="step-grid">
        {INSTALL_STEPS.map((step) => (
          <article className="step-card" key={step.n}>
            <b>{step.n}. {step.title}</b>
            <span>{step.text}</span>
          </article>
        ))}
      </div>
    </Frame>
  );
}

export function screenHelp(screen: ScreenId) {
  return screen;
}
