"use client";

import { useState } from "react";
import type { SettingsDTO } from "@/lib/types";

export function LoginScreen({
  settings,
  onSubmit,
}: {
  settings: SettingsDTO;
  onSubmit: (user: string, pin: string) => Promise<void>;
}) {
  const [user, setUser] = useState(settings.loginUser || "admin");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await onSubmit(user.trim(), pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر الدخول");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <section className="login-card">
        <img src="/logo.png" alt="" />
        <h1>مدير المبيعات</h1>
        <p className="sub">{settings.storeName}</p>
        <p className="sub">{settings.activity}</p>
        <label className="field name">
          المستخدم
          <input value={user} autoFocus onChange={(event) => setUser(event.target.value)} />
        </label>
        <label className="field name">
          الرمز
          <input
            type="password"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submit();
            }}
          />
        </label>
        {error ? <p className="bad">{error}</p> : <p className="sub">دخول الكاشير قبل فتح الدرج والفواتير</p>}
        <button className="btn" disabled={busy} onClick={() => void submit()}>{busy ? "جاري التحقق" : "دخول"}</button>
        <p className="sub">الافتراضي admin / 1234 ويمكن تغييره من الإعدادات</p>
      </section>
    </div>
  );
}
