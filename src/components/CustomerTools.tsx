"use client";

import { useEffect, useState } from "react";
import { cairoDay, formatDate, money } from "@/lib/format";
import { Frame, Pager, Pick, fill, type ScreenProps } from "./ui";

type StatementRow = { date: string; label: string; debit: number; credit: number; balance: number };

export function StatementScreen({ data, run, toast }: ScreenProps) {
  const today = cairoDay();
  const [kind, setKind] = useState("customer");
  const parties = kind === "supplier" ? data.suppliers : data.customers.filter((row) => !row.isSystem);
  const [partyId, setPartyId] = useState(parties[0]?.id ?? 0);
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [summary, setSummary] = useState({ opening: 0, debit: 0, credit: 0, closing: 0, partyName: "" });

  useEffect(() => {
    const saved = sessionStorage.getItem("noor-party-kind");
    if (saved === "supplier" || saved === "customer") setKind(saved);
  }, []);

  useEffect(() => {
    setPartyId(parties[0]?.id ?? 0);
  }, [kind]);

  async function load() {
    try {
      const extra = await run({ type: "statement", partyKind: kind, partyId, from, to });
      setRows((extra?.rows as StatementRow[]) ?? []);
      setSummary({
        opening: Number(extra?.opening || 0),
        debit: Number(extra?.debit || 0),
        credit: Number(extra?.credit || 0),
        closing: Number(extra?.closing || 0),
        partyName: String(extra?.partyName || ""),
      });
      setPage(0);
    } catch {
      toast("تعذر عرض الكشف", "err");
    }
  }

  const slice = rows.slice(page * 7, page * 7 + 7);
  return (
    <Frame title="كشف حساب" extra={<button className="btn" onClick={load}>عرض الكشف</button>}>
      <div className="fields">
        <label className="field short">النوع
          <Pick value={kind} options={[{ value: "customer", label: "عميل" }, { value: "supplier", label: "مورد" }]} onChange={setKind} />
        </label>
        <label className="field name">الاسم
          <Pick value={partyId} options={parties.map((row) => ({ value: row.id, label: row.name }))} onChange={(value) => setPartyId(Number(value))} />
        </label>
        <label className="field short">من<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="field short">إلى<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      <div className="kpis">
        <div className="kpi"><span>قبل الفترة</span><b className="num">{money(summary.opening)}</b></div>
        <div className="kpi"><span>مدين</span><b className="num">{money(summary.debit)}</b></div>
        <div className="kpi"><span>دائن</span><b className="num">{money(summary.credit)}</b></div>
        <div className="kpi"><span>الرصيد</span><b className="num">{money(summary.closing)} {data.settings.currency}</b></div>
        <div className="kpi"><span>الحساب</span><b>{summary.partyName || "—"}</b></div>
        <div className="kpi"><span>الحركة</span><b>{rows.length}</b></div>
      </div>
      <div className="table">
        <div className="thead" style={{ gridTemplateColumns: "110px 1.4fr 90px 90px 100px" }}>
          <span>التاريخ</span><span>البيان</span><span>مدين</span><span>دائن</span><span>الرصيد</span>
        </div>
        <div className="tbody" style={{ ["--rows" as string]: 7 }}>
          {fill(slice, 7).map((row, index) => (
            <div className="trow" key={index} style={{ gridTemplateColumns: "110px 1.4fr 90px 90px 100px" }}>
              <span>{row ? formatDate(row.date) : ""}</span>
              <span>{row?.label ?? ""}</span>
              <span className="num">{row ? money(row.debit) : ""}</span>
              <span className="num">{row ? money(row.credit) : ""}</span>
              <span className="num">{row ? money(row.balance) : ""}</span>
            </div>
          ))}
        </div>
      </div>
      <Pager page={page} pages={Math.max(1, Math.ceil(rows.length / 7))} setPage={setPage} />
    </Frame>
  );
}

export function InstallmentScreen({ data, run, toast }: ScreenProps) {
  const customers = data.customers.filter((row) => !row.isSystem);
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? 0);
  const customer = customers.find((row) => row.id === customerId);
  const [total, setTotal] = useState(customer?.balance || 0);
  const [down, setDown] = useState(0);
  const [months, setMonths] = useState(data.settings.installmentMonths || 4);
  const [notes, setNotes] = useState("");
  const [treasuryId, setTreasuryId] = useState(data.treasuries.find((row) => row.kind === "cash")?.id ?? 0);
  const [selected, setSelected] = useState(data.installments[0]?.id ?? 0);
  const [page, setPage] = useState(0);
  const monthly = months > 0 ? Math.max(0, (Number(total) - Number(down)) / Number(months)) : 0;
  const plans = data.installments;
  const slice = plans.slice(page * 5, page * 5 + 5);
  const dues = data.dues.filter((row) => row.planId === selected).sort((a, b) => a.dueNo - b.dueNo);

  async function save() {
    try {
      await run({ type: "savePlan", customerId, total, downPayment: down, months, notes, treasuryId });
      toast("تم إنشاء عقد التقسيط", "ok");
      setNotes("");
    } catch { /* toasted */ }
  }

  async function collect(dueId: number) {
    try {
      await run({ type: "collectDue", dueId, treasuryId });
      toast("تم تحصيل القسط", "ok");
    } catch { /* toasted */ }
  }

  return (
    <Frame title="نظام التقسيط" extra={<button className="btn" onClick={save}>حفظ العقد</button>}>
      <div className="fields">
        <label className="field name">العميل
          <Pick value={customerId} options={customers.map((row) => ({ value: row.id, label: row.name }))} onChange={(value) => { const id = Number(value); setCustomerId(id); const next = customers.find((row) => row.id === id); setTotal(next?.balance || 0); setDown(Math.round(((next?.balance || 0) * data.settings.downPercent) / 100)); }} />
        </label>
        <label className="field short">الإجمالي<input className="num" value={total} onChange={(e) => setTotal(Number(e.target.value || 0))} /></label>
        <label className="field short">المقدم<input className="num" value={down} onChange={(e) => setDown(Number(e.target.value || 0))} /></label>
        <label className="field short">الشهور<input className="num" value={months} onChange={(e) => setMonths(Number(e.target.value || 1))} /></label>
        <label className="field short">القسط<input className="num" readOnly value={monthly.toFixed(2)} /></label>
        <label className="field short">الخزينة
          <Pick value={treasuryId} options={data.treasuries.map((row) => ({ value: row.id, label: row.name }))} onChange={(value) => setTreasuryId(Number(value))} />
        </label>
        <label className="field line">بيان<input value={notes} placeholder="حقيبة أو كتب موسم الدراسة" onChange={(e) => setNotes(e.target.value)} /></label>
      </div>
      <div className="split" style={{ gridTemplateColumns: "1.2fr 0.8fr" }}>
        <div className="card">
          <div className="table">
            <div className="thead" style={{ gridTemplateColumns: "70px minmax(180px,1.4fr) 80px 70px 80px" }}>
              <span>عقد</span><span>العميل</span><span>الإجمالي</span><span>شهور</span><span>الحالة</span>
            </div>
            <div className="tbody" style={{ ["--rows" as string]: 5 }}>
              {fill(slice, 5).map((row, index) => (
                <button key={row?.id ?? index} className={`trow ${selected === row?.id ? "on" : ""}`} style={{ gridTemplateColumns: "70px minmax(180px,1.4fr) 80px 70px 80px", textAlign: "center" }} onClick={() => row && setSelected(row.id)}>
                  <span className="num">{row?.number ?? ""}</span>
                  <span>{row?.customerName ?? ""}</span>
                  <span className="num">{row ? money(row.total) : ""}</span>
                  <span>{row?.months ?? ""}</span>
                  <span className={row?.status === "مكتمل" ? "ok" : row?.status === "متأخر" ? "bad" : ""}>{row?.status ?? ""}</span>
                </button>
              ))}
            </div>
          </div>
          <Pager page={page} pages={Math.max(1, Math.ceil(plans.length / 5))} setPage={setPage} />
        </div>
        <div className="card">
          <b className="sub">أقساط العقد {selected || ""}</b>
          <div className="table">
            <div className="thead" style={{ gridTemplateColumns: "50px 100px 80px 70px 70px" }}>
              <span>رقم</span><span>الاستحقاق</span><span>المبلغ</span><span>الحالة</span><span />
            </div>
            <div className="tbody" style={{ ["--rows" as string]: 5 }}>
              {fill(dues.slice(0, 5), 5).map((row, index) => (
                <div className="trow" key={row?.id ?? index} style={{ gridTemplateColumns: "50px 100px 80px 70px 70px" }}>
                  <span>{row?.dueNo ?? ""}</span>
                  <span>{row?.dueDate ?? ""}</span>
                  <span className="num">{row ? money(row.amount) : ""}</span>
                  <span className={row?.status === "متأخر" ? "bad" : row?.status === "مسدد" ? "ok" : ""}>{row?.status ?? ""}</span>
                  <span>{row && row.status !== "مسدد" ? <button className="btn ok" onClick={() => collect(row.id)}>تحصيل</button> : ""}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="sub">غرامة التأخير من الإعدادات: {money(data.settings.lateFee)} {data.settings.currency}، وتضاف يدويًا عند التحصيل.</p>
        </div>
      </div>
    </Frame>
  );
}

export function ProfitScreen({ data, run }: ScreenProps) {
  const today = cairoDay();
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<{ number: number; date: string; partyName: string; total: number; cost: number; profit: number }[]>([]);

  async function load() {
    const extra = await run({ type: "report", report: "profit", from, to });
    setRows((extra?.rows as typeof rows) ?? []);
    setPage(0);
  }

  useEffect(() => {
    void load();
  }, []);

  const slice = rows.slice(page * 7, page * 7 + 7);
  const sum = rows.reduce((total, row) => total + Number(row.profit || 0), 0);
  return (
    <Frame title="الأرباح" extra={<button className="btn" onClick={load}>تحديث</button>}>
      <div className="fields">
        <label className="field short">من<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="field short">إلى<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <p className="sub">الربح تقديري: سعر البيع ناقص التكلفة والخصم، من غير المصروفات.</p>
      </div>
      <div className="kpis">
        <div className="kpi"><span>ربح اليوم</span><b className="num">{money(data.stats.todayProfit)}</b></div>
        <div className="kpi"><span>ربح الشهر</span><b className="num">{money(data.stats.monthProfit)}</b></div>
        <div className="kpi"><span>مبيعات الشهر</span><b className="num">{money(data.stats.monthSales)}</b></div>
        <div className="kpi"><span>مشتريات الشهر</span><b className="num">{money(data.stats.monthPurchases)}</b></div>
        <div className="kpi"><span>ربح الفترة</span><b className="num">{money(sum)}</b></div>
        <div className="kpi"><span>العملة</span><b>{data.settings.currency}</b></div>
      </div>
      <div className="table">
        <div className="thead" style={{ gridTemplateColumns: "70px 110px minmax(180px,1.4fr) 90px 90px 90px" }}>
          <span>رقم</span><span>التاريخ</span><span>العميل</span><span>البيع</span><span>التكلفة</span><span>الربح</span>
        </div>
        <div className="tbody" style={{ ["--rows" as string]: 7 }}>
          {fill(slice, 7).map((row, index) => (
            <div className="trow" key={index} style={{ gridTemplateColumns: "70px 110px minmax(180px,1.4fr) 90px 90px 90px" }}>
              <span className="num">{row?.number ?? ""}</span>
              <span>{row ? formatDate(row.date) : ""}</span>
              <span>{row?.partyName ?? ""}</span>
              <span className="num">{row ? money(row.total) : ""}</span>
              <span className="num">{row ? money(row.cost) : ""}</span>
              <span className={`num ${row && row.profit < 0 ? "bad" : "ok"}`}>{row ? money(row.profit) : ""}</span>
            </div>
          ))}
        </div>
      </div>
      <Pager page={page} pages={Math.max(1, Math.ceil(rows.length / 7))} setPage={setPage} />
    </Frame>
  );
}
