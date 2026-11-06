"use client";

import { useEffect, useMemo, useState } from "react";
import { postAction, loadBootstrap } from "@/lib/api";
import { SCREEN_LABELS } from "@/lib/constants";
import { daysUntil, docLabel, formatClock, formatDateTime, formatLongDate, money } from "@/lib/format";
import type { BootstrapData, DocDTO, DocItemDTO, ScreenId } from "@/lib/types";
import { Glyph } from "./icons";
import {
  AccountsScreen,
  ContactScreen,
  MaintenanceScreen,
  PricesScreen,
  ReportsScreen,
  DesktopInstallScreen,
  SettingsScreen,
  StatsScreen,
} from "./InsightScreens";
import { InstallmentScreen, ProfitScreen, StatementScreen } from "./CustomerTools";
import { LoginScreen } from "./LoginScreen";
import { InvoiceScreen } from "./InvoiceScreen";
import {
  AttendanceScreen,
  CashScreen,
  CustomersScreen,
  EmployeesScreen,
  ExpensesScreen,
  ProductsScreen,
  SuppliersScreen,
  TransfersScreen,
  TreasuryScreen,
  WarehousesScreen,
} from "./ManageScreens";

type MenuId = "file" | "customers" | "suppliers" | "warehouses" | "purchases" | "sales" | "accounts" | "employees" | "maint" | "reports" | "contact";

const MENUS: { id: MenuId; label: string; items: { label: string; screen: ScreenId; kind?: string }[] }[] = [
  { id: "file", label: "ملف", items: [{ label: "الرئيسية", screen: "home" }, { label: "الإعدادات", screen: "settings" }, { label: "تثبيت سطح المكتب", screen: "install" }, { label: "الصيانة", screen: "maintenance" }] },
  { id: "customers", label: "العملاء", items: [{ label: "قائمة العملاء", screen: "customers" }, { label: "كشف حساب", screen: "statement" }, { label: "التقسيط", screen: "installments" }, { label: "إستلام نقدية", screen: "cashIn" }, { label: "أرصدة العملاء", screen: "accounts" }] },
  { id: "suppliers", label: "الموردين", items: [{ label: "قائمة الموردين", screen: "suppliers" }, { label: "كشف حساب مورد", screen: "statement", kind: "supplier" }, { label: "دفع نقدية", screen: "cashOut" }, { label: "أرصدة الموردين", screen: "accounts" }] },
  { id: "warehouses", label: "المخازن", items: [{ label: "المخازن", screen: "warehouses" }, { label: "تحويلات مخازن", screen: "transfers" }, { label: "الأصناف", screen: "products" }, { label: "نواقص المخزون", screen: "reports" }] },
  { id: "purchases", label: "المشتريات", items: [{ label: "فاتورة مشتريات", screen: "purchase" }, { label: "مرتجع مشتريات", screen: "purchaseReturn" }, { label: "كشف حساب مورد", screen: "statement", kind: "supplier" }, { label: "الأرباح", screen: "profits" }] },
  { id: "sales", label: "المبيعات", items: [{ label: "فاتورة بيع", screen: "sale" }, { label: "مرتجع مبيعات", screen: "saleReturn" }, { label: "بيان أسعار", screen: "prices" }, { label: "التقسيط", screen: "installments" }, { label: "الأرباح", screen: "profits" }] },
  { id: "accounts", label: "الحسابات", items: [{ label: "الخزينة", screen: "treasury" }, { label: "المصروفات", screen: "expenses" }, { label: "الأرباح", screen: "profits" }, { label: "التقسيط", screen: "installments" }, { label: "كشف حساب", screen: "statement" }] },
  { id: "employees", label: "الموظفين", items: [{ label: "إدارة الموظفين", screen: "employees" }, { label: "حضور وانصراف", screen: "attendance" }, { label: "صرف الراتب", screen: "employees" }] },
  { id: "maint", label: "الصيانة", items: [{ label: "صيانة النظام", screen: "maintenance" }, { label: "الإعدادات", screen: "settings" }, { label: "تثبيت سطح المكتب", screen: "install" }] },
  { id: "reports", label: "التقارير", items: [{ label: "التقارير", screen: "reports" }, { label: "الإحصائيات", screen: "stats" }, { label: "الأرباح", screen: "profits" }, { label: "كشف حساب", screen: "statement" }] },
  { id: "contact", label: "اتصل بنا", items: [{ label: "تواصل", screen: "contact" }] },
];

const RIGHT_TILES = [
  { id: "customers" as ScreenId, label: "العملاء", color: "#3dba6a", icon: "customers" },
  { id: "products" as ScreenId, label: "الأصناف", color: "#e8943a", icon: "products" },
  { id: "employees" as ScreenId, label: "الموظفين", color: "#7a6ad8", icon: "employees" },
  { id: "suppliers" as ScreenId, label: "الموردين", color: "#e6c04a", icon: "suppliers" },
  { id: "expenses" as ScreenId, label: "المصروفات", color: "#c8b43a", icon: "expenses" },
  { id: "treasury" as ScreenId, label: "الخزينة", color: "#e04b4b", icon: "safe" },
];

const MID_TILES = [
  { id: "sale" as ScreenId, label: "فاتورة بيع", color: "#3dba6a", icon: "sale", span: true },
  { id: "saleReturn" as ScreenId, label: "مرتجع مبيعات", color: "#3aa0e0", icon: "saleReturn" },
  { id: "purchase" as ScreenId, label: "فاتورة مشتريات", color: "#c45a6a", icon: "purchase" },
  { id: "prices" as ScreenId, label: "بيان أسعار", color: "#2eb8c8", icon: "prices" },
  { id: "purchaseReturn" as ScreenId, label: "مرتجع مشتريات", color: "#e07a3a", icon: "purchaseReturn" },
];

const LEFT_TILES = [
  { id: "cashOut" as ScreenId, label: "دفع نقدية", color: "#d64545", icon: "pay" },
  { id: "cashIn" as ScreenId, label: "إستلام نقدية", color: "#2eb8d0", icon: "receive" },
  { id: "attendance" as ScreenId, label: "حضور وانصراف", color: "#4a7ad8", icon: "attendance" },
  { id: "transfers" as ScreenId, label: "تحويلات مخازن", color: "#d4a017", icon: "transfer" },
  { id: "stats" as ScreenId, label: "إحصائيات", color: "#7a5ac8", icon: "stats", alone: true },
];

export default function App() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [error, setError] = useState("");
  const [tabs, setTabs] = useState<ScreenId[]>(["home"]);
  const [active, setActive] = useState<ScreenId>("home");
  const [menu, setMenu] = useState<MenuId | null>(null);
  const [toast, setToast] = useState<{ text: string; kind: "ok" | "err" } | null>(null);
  const [help, setHelp] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [more, setMore] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [printDoc, setPrintDoc] = useState<{ document: DocDTO; items: DocItemDTO[] } | null>(null);
  const [preview, setPreview] = useState(false);
  const [sessionUser, setSessionUser] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  async function load() {
    try {
      setError("");
      setData(await loadBootstrap());
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر الاتصال بقاعدة البيانات");
    }
  }

  useEffect(() => {
    setSessionUser(sessionStorage.getItem("noor-user"));
    setAuthReady(true);
    void load();
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = data?.settings.theme || "classic";
  }, [data?.settings.theme]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function notify(text: string, kind: "ok" | "err" = "ok") {
    setToast({ text, kind });
  }

  async function run(body: Record<string, unknown>) {
    try {
      const result = await postAction(body);
      setData(result.data);
      return result.extra;
    } catch (err) {
      notify(err instanceof Error ? err.message : "تعذر تنفيذ العملية", "err");
      throw err;
    }
  }

  function open(screen: ScreenId) {
    setTabs((prev) => (prev.includes(screen) ? prev : [...prev, screen]));
    setActive(screen);
    setMenu(null);
    setMore(false);
    setNotesOpen(false);
    setHelp(false);
  }

  function closeTab(screen: ScreenId) {
    if (screen === "home") return;
    setTabs((prev) => prev.filter((tab) => tab !== screen));
    if (active === screen) setActive("home");
  }

  const shown = useMemo(() => {
    if (tabs.length <= 7) return tabs;
    const head = tabs.filter((tab) => tab !== active).slice(0, 6);
    const keep = new Set<ScreenId>([active, ...head]);
    return tabs.filter((tab) => keep.has(tab));
  }, [tabs, active]);
  const hidden = tabs.filter((tab) => !shown.includes(tab));

  function logout() {
    sessionStorage.removeItem("noor-user");
    setSessionUser(null);
    setLocked(false);
  }

  if (!data || !authReady) {
    return (
      <div style={{ height: "100vh", display: "grid", placeItems: "center", background: "#1c2430", color: "white", textAlign: "center" }}>
        <div>
          <img src="/logo.png" alt="" width={72} height={72} style={{ borderRadius: "50%" }} />
          <h1 style={{ margin: "12px 0 6px" }}>مدير المبيعات</h1>
          <p>{error || "جاري تحميل قرطاسية ومكتبة النور..."}</p>
          {error ? <button className="btn" onClick={() => void load()}>إعادة المحاولة</button> : null}
        </div>
      </div>
    );
  }

  if (!sessionUser) {
    return (
      <LoginScreen
        settings={data.settings}
        onSubmit={async (user, pin) => {
          const result = await postAction({ type: "login", user, pin });
          const name = String(result.extra?.user || user);
          sessionStorage.setItem("noor-user", name);
          setData(result.data);
          setSessionUser(name);
        }}
      />
    );
  }

  const alerts = [
    ...data.stats.lowStock.slice(0, 4).map((item) => ({ text: `نواقص: ${item.name} (${item.qty})`, screen: "products" as ScreenId })),
    ...data.documents.filter((doc) => doc.status === "suspended").slice(0, 3).map((doc) => ({ text: `فاتورة معلقة #${doc.number}`, screen: "sale" as ScreenId })),
  ];
  const licenseDays = daysUntil("2027-12-31");
  const props = { data, run, toast: notify, open };

  return (
    <>
      <div className="app" onClick={() => { setMenu(null); setMore(false); }}>
        <div className="titlebar">
          <div className="brand-mini">
            <img src="/logo.png" alt="" />
            <span>مدير المبيعات — {data.settings.storeName}</span>
          </div>
          <div className="win">
            <button type="button" aria-label="تصغير">–</button>
            <button type="button" aria-label="تكبير">□</button>
            <button type="button" aria-label="خروج" onClick={logout}>×</button>
          </div>
        </div>
        <div className="menubar">
          <div className="menus">
            {MENUS.map((item) => (
              <div key={item.id} style={{ position: "relative" }} onClick={(event) => event.stopPropagation()}>
                <button className={`menu-btn ${menu === item.id ? "on" : ""}`} onClick={() => setMenu(menu === item.id ? null : item.id)}>
                  {item.label}
                </button>
                {menu === item.id && (
                  <div className="dropdown" style={{ top: "100%", right: 0 }}>
                    {item.items.map((entry) => (
                      <button key={entry.label} onClick={() => { if (entry.kind) sessionStorage.setItem("noor-party-kind", entry.kind); open(entry.screen); }}>{entry.label}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button className="bell" onClick={(event) => { event.stopPropagation(); setNotesOpen((value) => !value); }} aria-label="التنبيهات">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffe27a"><path d="M12 3a6 6 0 0 0-6 6v3.2L4 16h16l-2-3.8V9a6 6 0 0 0-6-6zm0 18a2.4 2.4 0 0 0 2.3-2h-4.6A2.4 2.4 0 0 0 12 21z" /></svg>
            {alerts.length > 0 && <em>{alerts.length}</em>}
          </button>
          {notesOpen && (
            <div className="dropdown" style={{ left: 8, right: "auto", top: 34 }} onClick={(event) => event.stopPropagation()}>
              {alerts.length === 0 && <button>لا توجد تنبيهات</button>}
              {alerts.map((alert) => (
                <button key={alert.text} onClick={() => open(alert.screen)}>{alert.text}</button>
              ))}
            </div>
          )}
        </div>
        <div className="tabbar">
          {shown.map((tab) => (
            <button key={tab} className={`tab ${active === tab ? "on" : ""}`} onClick={() => setActive(tab)}>
              <span>{SCREEN_LABELS[tab]}</span>
              {tab !== "home" && <i onClick={(event) => { event.stopPropagation(); closeTab(tab); }}>×</i>}
            </button>
          ))}
          {hidden.length > 0 && (
            <div className="more-tabs" style={{ position: "relative" }} onClick={(event) => event.stopPropagation()}>
              <button className="tab" onClick={() => setMore((value) => !value)}>المزيد</button>
              {more && (
                <div className="dropdown" style={{ top: 28, left: 0 }}>
                  {hidden.map((tab) => (
                    <button key={tab} onClick={() => open(tab)}>{SCREEN_LABELS[tab]}</button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <header className="brandbar">
          <div className="brand">
            <img src="/logo.png" alt="" />
            <div>
              <strong>Sales Manager</strong>
              <small>{data.settings.storeName}</small>
            </div>
          </div>
          <button className="help-btn" onClick={() => setHelp(true)} aria-label="مساعدة">?</button>
        </header>
        <main className="stage">
          {toast && <div className={`toast ${toast.kind}`}>{toast.text}</div>}
          {active !== "home" && <RelatedLinks active={active} open={open} />}
          <div className="stage-fill">
          {active === "home" && <Dashboard onOpen={open} />}
          {active === "sale" && <InvoiceScreen {...props} mode="sale" active onPrint={showPrint} />}
          {active === "purchase" && <InvoiceScreen {...props} mode="purchase" active onPrint={showPrint} />}
          {active === "saleReturn" && <InvoiceScreen {...props} mode="saleReturn" active onPrint={showPrint} />}
          {active === "purchaseReturn" && <InvoiceScreen {...props} mode="purchaseReturn" active onPrint={showPrint} />}
          {active === "products" && <ProductsScreen {...props} />}
          {active === "customers" && <CustomersScreen {...props} />}
          {active === "suppliers" && <SuppliersScreen {...props} />}
          {active === "employees" && <EmployeesScreen {...props} />}
          {active === "warehouses" && <WarehousesScreen {...props} />}
          {active === "cashIn" && <CashScreen {...props} direction="in" />}
          {active === "cashOut" && <CashScreen {...props} direction="out" />}
          {active === "expenses" && <ExpensesScreen {...props} />}
          {active === "treasury" && <TreasuryScreen {...props} />}
          {active === "attendance" && <AttendanceScreen {...props} />}
          {active === "transfers" && <TransfersScreen {...props} />}
          {active === "stats" && <StatsScreen {...props} />}
          {active === "reports" && <ReportsScreen {...props} />}
          {active === "prices" && <PricesScreen {...props} />}
          {active === "accounts" && <AccountsScreen {...props} />}
          {active === "settings" && <SettingsScreen {...props} />}
          {active === "maintenance" && <MaintenanceScreen {...props} />}
          {active === "install" && <DesktopInstallScreen {...props} />}
          {active === "statement" && <StatementScreen {...props} />}
          {active === "installments" && <InstallmentScreen {...props} />}
          {active === "profits" && <ProfitScreen {...props} />}
          {active === "contact" && <ContactScreen {...props} />}
          </div>
          {help && (
            <div className="overlay" onClick={() => setHelp(false)}>
              <div className="panel" onClick={(event) => event.stopPropagation()}>
                <header>
                  <span>مساعدة الكاشير</span>
                  <button className="btn ghost" onClick={() => setHelp(false)}>إغلاق</button>
                </header>
                <div className="body">
                  <div className="tips">
                    <p>F2 استلام كامل · F4 فاتورة جديدة · F6 المدفوع · F8 نصف سعر السطر · F9 تعليق · F10 حفظ وطباعة · F11 خصم · Ctrl+S حفظ.</p>
                    <p>اكتب كود الصنف واضغط Enter، أو اضغط زر الصنف. كتب خارجية: اختر القسم ثم المرحلة.</p>
                    <p>المدارس تُسجل عميل جملة وآجل. التحصيل من شاشة العملاء أو استلام نقدية.</p>
                    <p>الجرس يعرض النواقص والفواتير المعلقة. الإعدادات فيها توصيات النشاط وبيانات الشريط السفلي.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {preview && printDoc && (
            <div className="overlay" onClick={() => setPreview(false)}>
              <div className="panel" onClick={(event) => event.stopPropagation()} style={{ width: 460 }}>
                <header>
                  <span>معاينة الطباعة</span>
                  <button className="btn" onClick={() => window.print()}>طباعة</button>
                </header>
                <div className="body">
                  <Receipt data={data} document={printDoc.document} items={printDoc.items} />
                </div>
              </div>
            </div>
          )}
          {locked && (
            <div className="lock">
              <div>
                <img src="/logo.png" alt="" width={64} height={64} style={{ borderRadius: "50%" }} />
                <h2>تم تسجيل الخروج</h2>
                <p>المستخدم {sessionUser}</p>
                <button className="btn" onClick={logout}>دخول من جديد</button>
              </div>
            </div>
          )}
        </main>
        <footer className="contactbar">
          <button onClick={() => copy(data.settings.phone, notify)}>
            <span className="bubble">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366"><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.6-1.2A9 9 0 1 0 12 3zm4.8 12.6c-.2.6-1.2 1.1-1.7 1.1-.4 0-.9.1-3.1-.9-2.6-1.2-4.2-3.8-4.3-4-.2-.2-1-1.3-1-2.5s.6-1.8.9-2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5.2.6.8 2 .8 2.1.1.1 0 .3-.1.4l-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.4.3.1.4 0 .6-.2l.5-.6c.2-.2.3-.2.6-.1.2.1 1.6.8 1.9.9.3.2.4.2.5.3.1.2 0 .7-.2 1.3z" /></svg>
            </span>
            {data.settings.phone}
          </button>
          <button onClick={() => copy(data.settings.website || "", notify)}>
            <span className="bubble">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#d4893a"><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm6.7 8h-3.1a14 14 0 0 0-1.2-5 7.1 7.1 0 0 1 4.3 5zM12 5c.7 1.1 1.3 2.8 1.6 5H10.4c.3-2.2.9-3.9 1.6-5zM9.6 6a14 14 0 0 0-1.2 5H5.3a7.1 7.1 0 0 1 4.3-5zM5.1 13h3.2c.1 1.8.5 3.4 1.1 4.7A7.1 7.1 0 0 1 5.1 13zm5.3 0h3.2c-.3 2.1-.9 3.8-1.6 4.8-.7-1-1.3-2.7-1.6-4.8zm3.8 4.8c.6-1.3 1-2.9 1.1-4.8h3.2a7.1 7.1 0 0 1-4.3 4.8z" /></svg>
            </span>
            {data.settings.website}
          </button>
          <button onClick={() => copy(data.settings.email || "", notify)}>
            <span className="bubble">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#d4893a"><path d="M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm8 7 7-4.5V8l-7 4.5L5 8v.5L12 13z" /></svg>
            </span>
            {data.settings.email}
          </button>
        </footer>
        <footer className="statusbar">
          <div>
            المستخدم: {data.settings.cashierName} · {formatLongDate(now)} · {formatClock(now)} · الترخيص ساري حتى 31/12/2027 · متبقي {licenseDays} يوم
          </div>
          <div className="copy">Copyright © Noor Soft 2024 - 2026</div>
        </footer>
      </div>
      <div className="print-root">
        {printDoc && <Receipt data={data} document={printDoc.document} items={printDoc.items} />}
      </div>
    </>
  );

  function showPrint(document: DocDTO, items: DocItemDTO[]) {
    setPrintDoc({ document, items });
    setPreview(true);
  }
}

function copy(text: string, notify: (text: string, kind?: "ok" | "err") => void) {
  if (!text) return;
  navigator.clipboard?.writeText(text).then(
    () => notify("تم نسخ البيان", "ok"),
    () => notify(text, "ok"),
  );
}

const LINK_GROUPS: { screens: ScreenId[]; items: { label: string; screen: ScreenId; kind?: string }[] }[] = [
  { screens: ["customers", "statement", "installments", "cashIn"], items: [
    { label: "العملاء", screen: "customers" },
    { label: "كشف حساب", screen: "statement", kind: "customer" },
    { label: "التقسيط", screen: "installments" },
    { label: "إستلام نقدية", screen: "cashIn" },
    { label: "الأرصدة", screen: "accounts" },
  ] },
  { screens: ["suppliers", "cashOut"], items: [
    { label: "الموردين", screen: "suppliers" },
    { label: "كشف مورد", screen: "statement", kind: "supplier" },
    { label: "دفع نقدية", screen: "cashOut" },
    { label: "الأرصدة", screen: "accounts" },
  ] },
  { screens: ["sale", "saleReturn", "prices", "profits"], items: [
    { label: "فاتورة بيع", screen: "sale" },
    { label: "مرتجع", screen: "saleReturn" },
    { label: "بيان أسعار", screen: "prices" },
    { label: "التقسيط", screen: "installments" },
    { label: "الأرباح", screen: "profits" },
  ] },
  { screens: ["purchase", "purchaseReturn"], items: [
    { label: "فاتورة شراء", screen: "purchase" },
    { label: "مرتجع شراء", screen: "purchaseReturn" },
    { label: "كشف مورد", screen: "statement", kind: "supplier" },
    { label: "الأرباح", screen: "profits" },
  ] },
  { screens: ["treasury", "expenses", "accounts"], items: [
    { label: "الخزينة", screen: "treasury" },
    { label: "المصروفات", screen: "expenses" },
    { label: "الأرباح", screen: "profits" },
    { label: "التقسيط", screen: "installments" },
    { label: "كشف حساب", screen: "statement" },
  ] },
  { screens: ["products", "warehouses", "transfers"], items: [
    { label: "الأصناف", screen: "products" },
    { label: "المخازن", screen: "warehouses" },
    { label: "تحويلات", screen: "transfers" },
    { label: "بيان أسعار", screen: "prices" },
  ] },
  { screens: ["employees", "attendance"], items: [
    { label: "الموظفين", screen: "employees" },
    { label: "حضور وانصراف", screen: "attendance" },
    { label: "المصروفات", screen: "expenses" },
  ] },
  { screens: ["reports", "stats"], items: [
    { label: "التقارير", screen: "reports" },
    { label: "الإحصائيات", screen: "stats" },
    { label: "الأرباح", screen: "profits" },
    { label: "كشف حساب", screen: "statement" },
  ] },
  { screens: ["settings", "maintenance", "install", "contact"], items: [
    { label: "الإعدادات", screen: "settings" },
    { label: "الصيانة", screen: "maintenance" },
    { label: "التثبيت", screen: "install" },
    { label: "اتصل بنا", screen: "contact" },
  ] },
];

function RelatedLinks({ active, open }: { active: ScreenId; open: (screen: ScreenId) => void }) {
  const group = LINK_GROUPS.find((item) => item.screens.includes(active));
  if (!group) return null;
  return (
    <div className="links">
      {group.items.map((item) => (
        <button
          key={item.label}
          className={`chip ${active === item.screen && !item.kind ? "on" : ""}`}
          onClick={() => {
            if (item.kind) sessionStorage.setItem("noor-party-kind", item.kind);
            open(item.screen);
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function Dashboard({ onOpen }: { onOpen: (screen: ScreenId) => void }) {
  return (
    <div className="dashboard">
      <div className="chevrons" aria-hidden>
        {[0, 1, 2].map((item) => (
          <svg key={item} width="54" height="28" viewBox="0 0 54 28">
            <path d="M4 24 L27 6 L50 24" fill="none" stroke="#9aa4b2" strokeWidth="3" />
          </svg>
        ))}
      </div>
      <div className="watermark" aria-hidden>
        <span className="a">NOOR</span>
        <span className="b">SOFT</span>
      </div>
      <div className="cluster side">
        {LEFT_TILES.map((tile) => (
          <Tile key={tile.id} tile={tile} onOpen={onOpen} />
        ))}
      </div>
      <div className="cluster mid">
        {MID_TILES.map((tile) => (
          <Tile key={tile.id} tile={tile} onOpen={onOpen} />
        ))}
      </div>
      <div className="cluster side">
        {RIGHT_TILES.map((tile) => (
          <Tile key={tile.id} tile={tile} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

function Tile({
  tile,
  onOpen,
}: {
  tile: { id: ScreenId; label: string; color: string; icon: string; span?: boolean; alone?: boolean };
  onOpen: (screen: ScreenId) => void;
}) {
  return (
    <button className={`tile ${tile.span ? "span" : ""} ${tile.alone ? "alone" : ""}`} style={{ ["--accent" as string]: tile.color }} onClick={() => onOpen(tile.id)}>
      <Glyph name={tile.icon} />
      <b>{tile.label}</b>
    </button>
  );
}

function Receipt({ data, document, items }: { data: BootstrapData; document: DocDTO; items: DocItemDTO[] }) {
  return (
    <article className="receipt">
      <h2>{data.settings.storeName}</h2>
      <p>{data.settings.activity}</p>
      <p>{data.settings.address}</p>
      <p>{data.settings.phone} · {data.settings.website}</p>
      <hr />
      <p><b>{docLabel(document.docType)} رقم {document.number}</b></p>
      <p>{formatDateTime(document.createdAt)} · {document.cashier}</p>
      <p>الطرف: {document.partyName}</p>
      <p>الدفع: {document.paymentType} · {document.priceType}</p>
      <table>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.qty}</td>
              <td>{money(item.unitPrice)}</td>
              <td>{money(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>الإجمالي: {money(document.subtotal)}</p>
      <p>الخصم: {money(document.discountAmount)} · الضريبة: {money(document.taxAmount)} · التوصيل: {money(document.deliveryFee)}</p>
      <p><b>الصافي: {money(document.total)}</b></p>
      <p>المدفوع: {money(document.paid)} · الباقي: {money(document.changeAmount)}</p>
      <p>{data.settings.footerNote}</p>
    </article>
  );
}
