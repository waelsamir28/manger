import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/cairo/arabic-400.css";
import "@fontsource/cairo/arabic-600.css";
import "@fontsource/cairo/arabic-700.css";
import "@fontsource/cairo/arabic-800.css";
import "@fontsource/cairo/latin-400.css";
import "@fontsource/cairo/latin-700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "مدير المبيعات | قرطاسية ومكتبة النور",
  description: "برنامج مبيعات كامل للقرطاسية والمستلزمات المكتبية والكتب الخارجية.",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
