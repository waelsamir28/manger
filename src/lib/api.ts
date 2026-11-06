import type { BootstrapData } from "./types";

export async function loadBootstrap() {
  const response = await fetch("/api/bootstrap", { cache: "no-store" });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message || "تعذر تحميل البيانات");
  return json as BootstrapData;
}

export async function postAction(body: Record<string, unknown>) {
  const response = await fetch("/api/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok || json.ok === false) throw new Error(json.message || "تعذر تنفيذ العملية");
  return json as { ok: true; data: BootstrapData; extra?: Record<string, unknown> };
}
