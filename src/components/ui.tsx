"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { BootstrapData, ScreenId } from "@/lib/types";

export type ScreenProps = {
  data: BootstrapData;
  run: (body: Record<string, unknown>) => Promise<Record<string, unknown> | undefined>;
  toast: (message: string, kind?: "ok" | "err") => void;
  open: (screen: ScreenId) => void;
};

export function Frame({ title, extra, children }: { title: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="screen">
      <header className="screen-bar">
        <h2>{title}</h2>
        <div>{extra}</div>
      </header>
      <div className="screen-body">{children}</div>
    </section>
  );
}

export function Pager({ page, pages, setPage }: { page: number; pages: number; setPage: (page: number) => void }) {
  if (pages <= 1) return <div className="pager" />;
  return (
    <div className="pager">
      <button className="btn ghost" disabled={page <= 0} onClick={() => setPage(page - 1)}>
        السابق
      </button>
      <span>
        {page + 1} / {pages}
      </span>
      <button className="btn ghost" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
        التالي
      </button>
    </div>
  );
}

export function Pick({
  value,
  options,
  onChange,
}: {
  value: string | number;
  options: { value: string | number; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [box, setBox] = useState({ top: 0, left: 0, width: 220 });
  const root = useRef<HTMLDivElement>(null);
  const selected = options.find((item) => String(item.value) === String(value));
  const filtered = options.filter((item) => !query || item.label.includes(query));
  const pages = Math.max(1, Math.ceil(filtered.length / 6));
  const slice = filtered.slice(page * 6, page * 6 + 6);

  function toggle() {
    const rect = root.current?.getBoundingClientRect();
    if (rect) {
      const width = Math.max(rect.width, 230);
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      const menuHeight = 248;
      const top = rect.bottom + 4 + menuHeight > window.innerHeight ? Math.max(8, rect.top - menuHeight - 4) : rect.bottom + 4;
      setBox({ top, left, width });
    }
    setOpen((current) => !current);
    setPage(0);
  }

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="pick" ref={root}>
      <button type="button" className="pick-btn" onClick={toggle}>
        <span>{selected?.label || "اختر"}</span>
        <i>▾</i>
      </button>
      {open && (
        <div className="pick-menu" style={{ top: box.top, left: box.left, width: box.width }}>
          {options.length > 6 && (
            <input
              className="pick-search"
              value={query}
              placeholder="بحث"
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
            />
          )}
          {slice.map((item) => (
            <button
              type="button"
              key={String(item.value)}
              className={String(item.value) === String(value) ? "on" : ""}
              onClick={() => {
                onChange(String(item.value));
                setOpen(false);
                setQuery("");
              }}
            >
              {item.label}
            </button>
          ))}
          {!slice.length && <div className="sub">لا توجد نتائج</div>}
          {pages > 1 && (
            <div className="pick-pager">
              <button type="button" disabled={page <= 0} onClick={() => setPage(page - 1)}>السابق</button>
              <span>{page + 1}/{pages}</span>
              <button type="button" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>التالي</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function fill<T>(rows: T[], size: number) {
  return Array.from({ length: size }, (_, index) => rows[index] ?? null);
}

export function warehouseName(data: BootstrapData, id: number | null | undefined) {
  return data.warehouses.find((row) => row.id === id)?.name ?? "—";
}

export function treasuryName(data: BootstrapData, id: number | null | undefined) {
  return data.treasuries.find((row) => row.id === id)?.name ?? "—";
}
