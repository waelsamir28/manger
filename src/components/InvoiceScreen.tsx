"use client";

import { useEffect, useMemo, useState } from "react";
import { calcDocument } from "@/lib/calc";
import { stockOf } from "@/lib/constants";
import { docLabel, formatDateTime, money, qtyText, r2 } from "@/lib/format";
import type { BootstrapData, DocDTO, DocItemDTO, ProductDTO } from "@/lib/types";
import type { ScreenProps } from "./ui";
import { Pager, Pick } from "./ui";

type Mode = "sale" | "purchase" | "saleReturn" | "purchaseReturn";

type Line = {
  key: string;
  productId: number;
  code: string;
  name: string;
  unit: string;
  qty: number;
  unitPrice: number;
  basePrice: number;
  taxPercent: number;
};

type Draft = {
  id?: number;
  partyId: number;
  warehouseId: number;
  treasuryId: number;
  paymentType: string;
  priceType: string;
  discountPercent: number;
  discountAmount: number;
  deliveryFee: number;
  taxPercent: number;
  paid: number;
  notes: string;
  mergeSame: boolean;
  useLastPrice: boolean;
  quick: boolean;
  lines: Line[];
  paidTouched: boolean;
  sourceInvoiceId: number | null;
};

const META: Record<Mode, { title: string; party: "customer" | "supplier" }> = {
  sale: { title: "فاتورة بيع سريع", party: "customer" },
  purchase: { title: "فاتورة مشتريات", party: "supplier" },
  saleReturn: { title: "مرتجع مبيعات", party: "customer" },
  purchaseReturn: { title: "مرتجع مشتريات", party: "supplier" },
};

function storageKey(mode: Mode) {
  return `noor-draft-${mode}`;
}

function blankDraft(data: BootstrapData, mode: Mode): Draft {
  const warehouse = data.warehouses.find((row) => row.isDefault) ?? data.warehouses[0];
  const cash = data.treasuries.find((row) => row.kind === "cash") ?? data.treasuries[0];
  const customer = data.customers.find((row) => row.isSystem) ?? data.customers[0];
  const supplier = data.suppliers[0];
  return {
    partyId: META[mode].party === "supplier" ? supplier?.id ?? 0 : customer?.id ?? 0,
    warehouseId: warehouse?.id ?? 0,
    treasuryId: cash?.id ?? 0,
    paymentType: "نقدي",
    priceType: customer?.priceType || "قطاعي",
    discountPercent: 0,
    discountAmount: 0,
    deliveryFee: 0,
    taxPercent: data.settings.taxPercent,
    paid: 0,
    notes: "",
    mergeSame: true,
    useLastPrice: false,
    quick: true,
    lines: [],
    paidTouched: false,
    sourceInvoiceId: null,
  };
}

export function InvoiceScreen({
  data,
  mode,
  active,
  run,
  toast,
  onPrint,
}: ScreenProps & {
  mode: Mode;
  active: boolean;
  onPrint: (document: DocDTO, items: DocItemDTO[]) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => blankDraft(data, mode));
  const [ready, setReady] = useState(false);
  const [catId, setCatId] = useState(data.categories[0]?.id ?? 0);
  const [stage, setStage] = useState("الكل");
  const [query, setQuery] = useState("");
  const [code, setCode] = useState("");
  const [page, setPage] = useState(0);
  const [linePage, setLinePage] = useState(0);
  const [selected, setSelected] = useState("");
  const [docsOpen, setDocsOpen] = useState(false);
  const [partyOpen, setPartyOpen] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [docPage, setDocPage] = useState(0);

  useEffect(() => {
    const raw = sessionStorage.getItem(storageKey(mode));
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Draft;
        if (parsed && Array.isArray(parsed.lines)) setDraft(parsed);
      } catch {
        sessionStorage.removeItem(storageKey(mode));
      }
    }
    setReady(true);
  }, [mode]);

  useEffect(() => {
    if (!ready) return;
    sessionStorage.setItem(storageKey(mode), JSON.stringify(draft));
  }, [draft, mode, ready]);

  const totals = useMemo(
    () =>
      calcDocument({
        lines: draft.lines,
        discountPercent: draft.discountAmount > 0 ? 0 : draft.discountPercent,
        discountAmount: draft.discountAmount,
        deliveryFee: draft.deliveryFee,
        globalTaxPercent: draft.taxPercent,
        paid: draft.paid,
      }),
    [draft],
  );

  useEffect(() => {
    if (!data.settings.autoFillPaid || draft.paidTouched || draft.paymentType === "آجل") return;
    setDraft((prev) => (prev.paid === totals.total ? prev : { ...prev, paid: totals.total }));
  }, [data.settings.autoFillPaid, draft.paidTouched, draft.paymentType, totals.total]);

  const category = data.categories.find((row) => row.id === catId);
  const parties = META[mode].party === "customer" ? data.customers : data.suppliers;
  const party = parties.find((row) => row.id === draft.partyId);
  const previous = Number(party && "balance" in party ? party.balance : 0);
  const balanceSign = mode === "sale" || mode === "purchase" ? 1 : -1;
  const after = r2(previous + balanceSign * (draft.paymentType === "آجل" ? r2(totals.total - draft.paid) : totals.remaining));

  const filtered = data.products.filter((product) => {
    if (!product.active) return false;
    const text = query.trim();
    if (text) return product.name.includes(text) || product.code.includes(text) || (product.subject || "").includes(text);
    if (product.categoryId !== catId) return false;
    if (category?.kind === "book" && stage !== "الكل" && product.stage !== stage) return false;
    return true;
  });
  const productPages = Math.max(1, Math.ceil(filtered.length / 16));
  const productSlice = filtered.slice(page * 16, page * 16 + 16);
  const linePages = Math.max(1, Math.ceil(draft.lines.length / 7));
  const lineSlice = draft.lines.slice(linePage * 7, linePage * 7 + 7);
  const history = data.documents.filter((doc) => doc.docType === mode);
  const historySlice = history.slice(docPage * 6, docPage * 6 + 6);
  const suspended = data.documents.filter((doc) => doc.docType === mode && doc.status === "suspended").length;

  function reset() {
    const next = blankDraft(data, mode);
    setDraft(next);
    setSelected("");
    setLinePage(0);
    setCode("");
    sessionStorage.removeItem(storageKey(mode));
  }

  function priceFor(product: ProductDTO) {
    if (mode === "purchase" || mode === "purchaseReturn") return product.costPrice;
    if (draft.useLastPrice && META[mode].party === "customer") {
      const last = data.recentPrices.find((row) => row.customerId === draft.partyId && row.productId === product.id);
      if (last) return last.unitPrice;
    }
    return draft.priceType === "جملة" ? product.wholesalePrice : product.salePrice;
  }

  function addProduct(product: ProductDTO) {
    const price = r2(priceFor(product));
    setDraft((prev) => {
      const lines = [...prev.lines];
      if (prev.mergeSame) {
        const index = lines.findIndex((line) => line.productId === product.id && line.unitPrice === price);
        if (index >= 0) {
          lines[index] = { ...lines[index], qty: r2(lines[index].qty + 1) };
          return { ...prev, lines };
        }
      }
      lines.push({
        key: `${product.id}-${Date.now()}`,
        productId: product.id,
        code: product.code,
        name: product.name,
        unit: product.unit,
        qty: 1,
        unitPrice: price,
        basePrice: price,
        taxPercent: product.taxPercent,
      });
      return { ...prev, lines };
    });
    setLinePage(Math.max(0, Math.ceil((draft.lines.length + 1) / 7) - 1));
  }

  function addByCode() {
    const product = data.products.find((row) => row.active && row.code === code.trim());
    if (!product) {
      toast("الكود غير موجود", "err");
      return;
    }
    addProduct(product);
    setCode("");
  }

  function patchLine(key: string, patch: Partial<Line>) {
    setDraft((prev) => ({ ...prev, lines: prev.lines.map((line) => (line.key === key ? { ...line, ...patch } : line)) }));
  }

  async function save(options: { print?: boolean; suspend?: boolean } = {}) {
    try {
      const extra = await run({
        type: "saveDocument",
        id: draft.id,
        docType: mode,
        partyId: draft.partyId || null,
        warehouseId: draft.warehouseId,
        treasuryId: draft.treasuryId,
        paymentType: draft.paymentType,
        priceType: draft.priceType,
        discountPercent: draft.discountPercent,
        discountAmount: draft.discountAmount,
        deliveryFee: draft.deliveryFee,
        taxPercent: draft.taxPercent,
        paid: draft.paid,
        notes: draft.notes,
        sourceInvoiceId: draft.sourceInvoiceId,
        suspend: Boolean(options.suspend),
        lines: draft.lines.map((line) => ({
          productId: line.productId,
          qty: line.qty,
          unitPrice: line.unitPrice,
          taxPercent: line.taxPercent,
        })),
      });
      const saved = extra as { document?: DocDTO; items?: DocItemDTO[] } | undefined;
      toast(options.suspend ? "تم تعليق الفاتورة" : `تم حفظ ${META[mode].title}`, "ok");
      if (options.print && saved?.document && saved.items) onPrint(saved.document, saved.items);
      reset();
    } catch {
      /* toasted in shell */
    }
  }

  async function openDocument(doc: DocDTO) {
    try {
      const extra = (await run({ type: "getDocument", id: doc.id })) as { document?: DocDTO; items?: DocItemDTO[] } | undefined;
      if (!extra?.document || !extra.items) return;
      if (doc.status === "suspended") {
        setDraft({
          ...blankDraft(data, mode),
          id: doc.id,
          partyId: doc.partyId ?? draft.partyId,
          warehouseId: doc.warehouseId,
          treasuryId: doc.treasuryId ?? draft.treasuryId,
          paymentType: doc.paymentType,
          priceType: doc.priceType,
          discountPercent: doc.discountPercent,
          discountAmount: doc.discountAmount,
          deliveryFee: doc.deliveryFee,
          taxPercent: data.settings.taxPercent,
          paid: doc.paid,
          notes: doc.notes ?? "",
          sourceInvoiceId: doc.sourceInvoiceId,
          lines: extra.items.map((item) => ({
            key: String(item.id),
            productId: item.productId,
            code: item.code,
            name: item.name,
            unit: item.unit,
            qty: item.qty,
            unitPrice: item.unitPrice,
            basePrice: item.unitPrice,
            taxPercent: item.taxPercent,
          })),
          paidTouched: true,
        });
        setDocsOpen(false);
        toast("تم فتح الفاتورة المعلقة", "ok");
        return;
      }
      onPrint(extra.document, extra.items);
    } catch {
      /* toasted */
    }
  }

  async function voidDocument(id: number) {
    if (!window.confirm("إلغاء الفاتورة وعكس أثرها على المخزون والخزينة؟")) return;
    try {
      await run({ type: "voidDocument", id });
      toast("تم الإلغاء", "ok");
      if (draft.id === id) reset();
    } catch {
      /* toasted */
    }
  }

  async function quickParty() {
    if (!partyName.trim()) return;
    try {
      const extra = await run({
        type: META[mode].party === "customer" ? "saveCustomer" : "saveSupplier",
        name: partyName,
        phone: partyPhone,
        priceType: draft.priceType,
      });
      const id = Number(extra?.id || 0);
      if (id) setDraft((prev) => ({ ...prev, partyId: id }));
      setPartyName("");
      setPartyPhone("");
      setPartyOpen(false);
      toast("تمت الإضافة", "ok");
    } catch {
      /* toasted */
    }
  }

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      const key = event.key;
      if (["F2", "F4", "F5", "F6", "F8", "F9", "F10", "F11"].includes(key)) event.preventDefault();
      if (key === "F2") setDraft((prev) => ({ ...prev, paid: totals.total, paidTouched: true }));
      if (key === "F4") reset();
      if (key === "F5" && draft.id) void voidDocument(draft.id);
      if (key === "F5" && !draft.id) reset();
      if (key === "F6") document.getElementById("paid-input")?.focus();
      if (key === "F8" && selected) {
        setDraft((prev) => ({
          ...prev,
          lines: prev.lines.map((line) =>
            line.key === selected
              ? { ...line, unitPrice: line.unitPrice === r2(line.basePrice / 2) ? line.basePrice : r2(line.basePrice / 2) }
              : line,
          ),
        }));
      }
      if (key === "F9") void save({ suspend: true });
      if (key === "F10") void save({ print: true });
      if (key === "F11") document.getElementById("discount-input")?.focus();
      if ((event.ctrlKey || event.metaKey) && key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const nextNumber = data.nextNumbers[mode] ?? "";

  return (
    <section className="invoice">
      <div className="inv-top">
        <div className="badge-title">{META[mode].title}</div>
        <label>
          <input type="checkbox" checked={draft.quick} onChange={(event) => setDraft((prev) => ({ ...prev, quick: event.target.checked }))} />
          تفعيل سريع
        </label>
        <span className="muted" style={{ fontSize: 12, fontWeight: 800 }}>
          رقم الفاتورة {draft.id ? data.documents.find((doc) => doc.id === draft.id)?.number : nextNumber}
        </span>
        <span style={{ flex: 1 }} />
        <button className="btn ghost" onClick={() => setDocsOpen(true)}>
          الفواتير
        </button>
        <button className="btn ghost" onClick={() => setPartyOpen(true)}>
          + {META[mode].party === "customer" ? "عميل" : "مورد"}
        </button>
      </div>
      <div className="inv-meta">
        <label className="field short">
          التاريخ
          <input className="num" readOnly value={formatDateTime(new Date().toISOString())} />
        </label>
        <label className="field short">
          المخزن
          <Pick
            value={draft.warehouseId}
            options={data.warehouses.map((row) => ({ value: row.id, label: row.name }))}
            onChange={(value) => setDraft((prev) => ({ ...prev, warehouseId: Number(value) }))}
          />
        </label>
        <label className="field name">
          {META[mode].party === "customer" ? "العميل" : "المورد"}
          <Pick
            value={draft.partyId}
            options={parties.map((row) => ({ value: row.id, label: row.name }))}
            onChange={(value) => {
              const id = Number(value);
              const next = parties.find((row) => row.id === id);
              setDraft((prev) => ({
                ...prev,
                partyId: id,
                priceType: next && "priceType" in next ? String(next.priceType) : prev.priceType,
              }));
            }}
          />
        </label>
        <label className="field short">
          النوع
          <Pick
            value={draft.priceType}
            options={[{ value: "قطاعي", label: "قطاعي" }, { value: "جملة", label: "جملة" }]}
            onChange={(value) => setDraft((prev) => ({ ...prev, priceType: value }))}
          />
        </label>
        <label className="field short">
          خصم %
          <input
            className="num"
            value={draft.discountPercent}
            onChange={(event) => setDraft((prev) => ({ ...prev, discountPercent: Number(event.target.value || 0), discountAmount: 0 }))}
          />
        </label>
      </div>
      <div className="inv-search">
        <label className="field short">
          الكود
          <input
            className="num"
            value={code}
            autoFocus
            onChange={(event) => setCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addByCode();
              }
            }}
          />
        </label>
        <label className="field name">
          بحث الصنف
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder="اسم أو مادة أو كود"
          />
        </label>
        <label>
          <input type="checkbox" checked={draft.mergeSame} onChange={(event) => setDraft((prev) => ({ ...prev, mergeSame: event.target.checked }))} />
          تجميع المتشابه
        </label>
        <label>
          <input type="checkbox" checked={draft.useLastPrice} onChange={(event) => setDraft((prev) => ({ ...prev, useLastPrice: event.target.checked }))} />
          آخر سعر للعميل
        </label>
        {(mode === "saleReturn" || mode === "purchaseReturn") && (
          <label className="field name">
            فاتورة أصلية
            <Pick
              value={draft.sourceInvoiceId ?? ""}
              options={[
                { value: "", label: "بدون" },
                ...data.documents
                  .filter((doc) => doc.status === "saved" && doc.docType === (mode === "saleReturn" ? "sale" : "purchase"))
                  .slice(0, 30)
                  .map((doc) => ({ value: doc.id, label: `${doc.number} — ${doc.partyName}` })),
              ]}
              onChange={(value) => setDraft((prev) => ({ ...prev, sourceInvoiceId: Number(value) || null }))}
            />
          </label>
        )}
      </div>
      <div className="inv-main">
        <div className="lines">
          <div className="line-grid">
            <div className="thead" style={{ gridTemplateColumns: "72px minmax(220px,1.7fr) 64px 78px 64px 84px 34px" }}>
              <span>كود</span>
              <span>الصنف</span>
              <span>الوحدة</span>
              <span>السعر</span>
              <span>كمية</span>
              <span>الإجمالي</span>
              <span />
            </div>
            {Array.from({ length: 7 }, (_, index) => {
              const line = lineSlice[index];
              if (!line) return <div className="trow" key={`empty-${index}`} style={{ gridTemplateColumns: "72px minmax(220px,1.7fr) 64px 78px 64px 84px 34px" }} />;
              return (
                <div
                  className={`trow ${selected === line.key ? "on" : ""}`}
                  key={line.key}
                  style={{ gridTemplateColumns: "72px minmax(220px,1.7fr) 64px 78px 64px 84px 34px" }}
                  onClick={() => setSelected(line.key)}
                >
                  <span className="num">{line.code}</span>
                  <span>{line.name}</span>
                  <span>{line.unit}</span>
                  <span>
                    <input className="num" value={line.unitPrice} onChange={(event) => patchLine(line.key, { unitPrice: Number(event.target.value || 0) })} />
                  </span>
                  <span>
                    <input className="num" value={line.qty} onChange={(event) => patchLine(line.key, { qty: Number(event.target.value || 0) })} />
                  </span>
                  <span className="num">{money(line.qty * line.unitPrice)}</span>
                  <span>
                    <button
                      className="x"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDraft((prev) => ({ ...prev, lines: prev.lines.filter((row) => row.key !== line.key) }));
                      }}
                    >
                      ×
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
          <Pager page={linePage} pages={linePages} setPage={setLinePage} />
        </div>
        <div className="pad">
          <div className="cats">
            {data.categories.map((row) => (
              <button
                key={row.id}
                className={`chip ${catId === row.id && !query ? "on" : ""}`}
                onClick={() => {
                  setCatId(row.id);
                  setQuery("");
                  setPage(0);
                  setStage("الكل");
                }}
              >
                {row.name}
              </button>
            ))}
          </div>
          {category?.kind === "book" && !query && (
            <div className="stages">
              {["الكل", "ابتدائي", "إعدادي", "ثانوي"].map((item) => (
                <button key={item} className={`chip ${stage === item ? "on" : ""}`} onClick={() => { setStage(item); setPage(0); }}>
                  {item}
                </button>
              ))}
            </div>
          )}
          <div className="pkey-grid">
            {Array.from({ length: 16 }, (_, index) => {
              const product = productSlice[index];
              if (!product) return <div key={`p-${index}`} />;
              const qty = stockOf(product.stocks, draft.warehouseId);
              return (
                <button key={product.id} className={`pkey ${qty <= product.minStock ? "low" : ""}`} onClick={() => addProduct(product)}>
                  <small>{qtyText(qty)}</small>
                  {product.name.replace("كتاب خارجي ", "")}
                </button>
              );
            })}
          </div>
          <Pager page={page} pages={productPages} setPage={setPage} />
        </div>
      </div>
      <div className="inv-bottom">
        <div className="mini">
          <div className="line"><span>عدد الأصناف</span><b className="num">{totals.count}</b></div>
          <div className="line"><span>إجمالي الكميات</span><b className="num">{qtyText(totals.qty)}</b></div>
          <label className="field short">
            الخزينة
            <Pick
              value={draft.treasuryId}
              options={data.treasuries.map((row) => ({ value: row.id, label: row.name }))}
              onChange={(value) => setDraft((prev) => ({ ...prev, treasuryId: Number(value) }))}
            />
          </label>
          <div className="line"><span>معلقة</span><b>{suspended}</b></div>
        </div>
        <div className="mini">
          <div className="line"><span>المتبقي من الفاتورة</span><b className="num">{money(totals.remaining)}</b></div>
          <div className="line"><span>الرصيد السابق</span><b className="num">{money(previous)}</b></div>
          <div className="line"><span>الرصيد بعد الفاتورة</span><b className="num">{money(after)}</b></div>
          <input value={draft.notes} placeholder="ملاحظات" onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))} />
        </div>
        <div className="mini">
          <div className="netbox">
            <span>المبلغ الصافي</span>
            <b className="num">{money(totals.total)}</b>
          </div>
          <div className="line"><span>بدون خصم</span><b className="num">{money(totals.subtotal)}</b></div>
        </div>
        <div className="mini">
          <label className="field short">
            نوع الدفع
            <Pick
              value={draft.paymentType}
              options={[{ value: "نقدي", label: "نقدي" }, { value: "آجل", label: "آجل" }, { value: "فيزا", label: "فيزا" }]}
              onChange={(value) => {
                const bank = data.treasuries.find((row) => row.kind === "bank");
                const cash = data.treasuries.find((row) => row.kind === "cash");
                setDraft((prev) => ({
                  ...prev,
                  paymentType: value,
                  paidTouched: false,
                  treasuryId: value === "فيزا" ? bank?.id ?? prev.treasuryId : cash?.id ?? prev.treasuryId,
                }));
              }}
            />
          </label>
          <div className="line">
            <span>التوصيل</span>
            <input className="num" style={{ width: 70 }} value={draft.deliveryFee} onChange={(event) => setDraft((prev) => ({ ...prev, deliveryFee: Number(event.target.value || 0) }))} />
          </div>
          <div className="line">
            <span>الضريبة %</span>
            <input className="num" style={{ width: 54 }} value={draft.taxPercent} onChange={(event) => setDraft((prev) => ({ ...prev, taxPercent: Number(event.target.value || 0) }))} />
            <b className="num">{money(totals.tax)}</b>
          </div>
          <div className="line">
            <span>خصم</span>
            <input id="discount-input" className="num" style={{ width: 70 }} value={draft.discountAmount} onChange={(event) => setDraft((prev) => ({ ...prev, discountAmount: Number(event.target.value || 0), discountPercent: 0 }))} />
          </div>
          <div className="line">
            <span>المدفوع</span>
            <input
              id="paid-input"
              className="num"
              style={{ width: 80 }}
              value={draft.paid}
              onChange={(event) => setDraft((prev) => ({ ...prev, paid: Number(event.target.value || 0), paidTouched: true }))}
            />
          </div>
          <div className="line"><span>الباقي</span><b className="num">{money(totals.change)}</b></div>
        </div>
      </div>
      <div className="inv-actions">
        <div className="group">
          <button className="key" style={{ background: "#2f62e4" }} onClick={reset}>فاتورة جديدة F4</button>
          <button className="key" style={{ background: "#0f766e" }} onClick={() => document.getElementById("paid-input")?.focus()}>المدفوع F6</button>
          <button className="key" style={{ background: "#b91c1c" }} onClick={() => document.getElementById("discount-input")?.focus()}>خصم F11</button>
          <button className="key" style={{ background: "#15803d" }} onClick={() => setDraft((prev) => ({ ...prev, paid: totals.total, paidTouched: true }))}>استلام F2</button>
          <button
            className="key"
            style={{ background: "#c2410c" }}
            onClick={() => {
              if (!selected) return toast("اختر سطرًا أولاً", "err");
              setDraft((prev) => ({
                ...prev,
                lines: prev.lines.map((line) =>
                  line.key === selected ? { ...line, unitPrice: line.unitPrice === r2(line.basePrice / 2) ? line.basePrice : r2(line.basePrice / 2) } : line,
                ),
              }));
            }}
          >
            نصف السعر F8
          </button>
          <button className="key" style={{ background: "#991b1b" }} onClick={() => (draft.id ? voidDocument(draft.id) : reset())}>حذف F5</button>
        </div>
        <div className="group">
          <button className="key" style={{ background: "#64748b" }} onClick={() => save({ suspend: true })}>تعليق F9</button>
          <button className="key" style={{ background: "#0369a1" }} onClick={() => save({ print: true })}>حفظ وطباعة F10</button>
          <button className="key" style={{ background: "#1d4ed8" }} onClick={() => save()}>حفظ</button>
        </div>
      </div>
      {docsOpen && (
        <div className="overlay" onClick={() => setDocsOpen(false)}>
          <div className="panel" onClick={(event) => event.stopPropagation()} style={{ width: 640 }}>
            <header>
              <span>{docLabel(mode)}</span>
              <button className="btn ghost" onClick={() => setDocsOpen(false)}>إغلاق</button>
            </header>
            <div className="body">
              <div className="table" style={{ height: 280 }}>
                <div className="thead" style={{ gridTemplateColumns: "70px 1fr 90px 90px 80px" }}>
                  <span>رقم</span><span>الطرف</span><span>الإجمالي</span><span>الحالة</span><span />
                </div>
                <div className="tbody" style={{ ["--rows" as string]: 6 }}>
                  {Array.from({ length: 6 }, (_, index) => {
                    const doc = historySlice[index];
                    if (!doc) return <div className="trow" key={index} style={{ gridTemplateColumns: "70px 1fr 90px 90px 80px" }} />;
                    return (
                      <div className="trow" key={doc.id} style={{ gridTemplateColumns: "70px 1fr 90px 90px 80px" }}>
                        <span className="num">{doc.number}</span>
                        <span>{doc.partyName}</span>
                        <span className="num">{money(doc.total)}</span>
                        <span>{doc.status === "saved" ? "محفوظة" : doc.status === "suspended" ? "معلقة" : "ملغاة"}</span>
                        <span>
                          <button className="btn ghost" onClick={() => openDocument(doc)}>فتح</button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <Pager page={docPage} pages={Math.max(1, Math.ceil(history.length / 6))} setPage={setDocPage} />
            </div>
          </div>
        </div>
      )}
      {partyOpen && (
        <div className="overlay" onClick={() => setPartyOpen(false)}>
          <div className="panel" onClick={(event) => event.stopPropagation()} style={{ width: 360 }}>
            <header>
              <span>إضافة سريعة</span>
              <button className="btn ghost" onClick={() => setPartyOpen(false)}>إغلاق</button>
            </header>
            <div className="body fields">
              <label className="field wide">الاسم<input value={partyName} onChange={(event) => setPartyName(event.target.value)} /></label>
              <label className="field wide">الهاتف<input value={partyPhone} onChange={(event) => setPartyPhone(event.target.value)} /></label>
              <button className="btn" onClick={quickParty}>حفظ</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
