export function Glyph({ name }: { name: string }) {
  const common = { width: 54, height: 54, viewBox: "0 0 64 64", "aria-hidden": true as const };
  switch (name) {
    case "products":
      return (
        <svg {...common}>
          <rect x="8" y="30" width="22" height="22" rx="4" fill="#f59e0b" />
          <rect x="34" y="30" width="22" height="22" rx="4" fill="#38bdf8" />
          <rect x="20" y="10" width="24" height="18" rx="4" fill="#fb7185" />
          <path d="M16 38h8M38 40h10M26 16h12" stroke="white" strokeWidth="2" />
        </svg>
      );
    case "customers":
      return (
        <svg {...common}>
          <circle cx="22" cy="24" r="8" fill="#60a5fa" />
          <circle cx="40" cy="22" r="7" fill="#f9a8d4" />
          <circle cx="32" cy="34" r="6" fill="#fbbf24" />
          <path d="M10 52c2-8 8-12 14-12s12 4 14 12" fill="#93c5fd" />
          <path d="M30 50c1-6 5-9 10-9 6 0 10 4 12 11" fill="#fbcfe8" />
          <path d="M46 14l2 4 4 .4-3 3 .8 4.2L46 23l-3.8 2.6.8-4.2-3-3 4-.4z" fill="#fb7185" />
        </svg>
      );
    case "suppliers":
      return (
        <svg {...common}>
          <circle cx="24" cy="18" r="8" fill="#fbbf24" />
          <path d="M12 50c1-10 6-14 12-14s11 4 12 14" fill="#38bdf8" />
          <rect x="34" y="28" width="20" height="16" rx="2" fill="#f59e0b" />
          <path d="M34 32h20M40 28v16" stroke="#fff7ed" strokeWidth="1.5" />
          <rect x="16" y="12" width="16" height="5" rx="2" fill="#1d4ed8" />
        </svg>
      );
    case "employees":
      return (
        <svg {...common}>
          <circle cx="18" cy="20" r="7" fill="#93c5fd" />
          <circle cx="34" cy="18" r="8" fill="#60a5fa" />
          <circle cx="48" cy="21" r="6" fill="#bfdbfe" />
          <path d="M8 52c1-9 6-13 12-13s10 4 11 13" fill="#3b82f6" />
          <path d="M24 52c1-10 6-15 12-15s11 5 12 15" fill="#1d4ed8" />
          <path d="M40 52c1-8 4-11 8-11 5 0 8 3 9 11" fill="#60a5fa" />
        </svg>
      );
    case "safe":
      return (
        <svg {...common}>
          <rect x="12" y="10" width="40" height="44" rx="4" fill="#fbbf24" />
          <rect x="18" y="16" width="28" height="28" rx="3" fill="#f59e0b" />
          <circle cx="32" cy="30" r="7" fill="#fde68a" />
          <circle cx="32" cy="30" r="2.5" fill="#92400e" />
          <path d="M32 24v3M32 33v3M26 30h3M35 30h3" stroke="#92400e" strokeWidth="1.4" />
          <rect x="28" y="46" width="8" height="6" fill="#d97706" />
        </svg>
      );
    case "expenses":
      return (
        <svg {...common}>
          <rect x="14" y="12" width="28" height="36" rx="4" fill="#e2e8f0" />
          <rect x="18" y="18" width="20" height="10" rx="2" fill="#0f172a" />
          <circle cx="22" cy="36" r="2" fill="#94a3b8" />
          <circle cx="28" cy="36" r="2" fill="#94a3b8" />
          <circle cx="34" cy="36" r="2" fill="#94a3b8" />
          <circle cx="46" cy="42" r="10" fill="#fbbf24" />
          <path d="M46 37v10M42 42h8" stroke="#92400e" strokeWidth="2" />
        </svg>
      );
    case "sale":
      return (
        <svg {...common}>
          <rect x="16" y="8" width="32" height="44" rx="4" fill="#e0f2fe" />
          <path d="M22 18h20M22 24h16M22 30h18" stroke="#0284c7" strokeWidth="2" />
          <circle cx="40" cy="42" r="12" fill="#38bdf8" />
          <text x="40" y="47" textAnchor="middle" fontSize="14" fontWeight="700" fill="white">$</text>
        </svg>
      );
    case "purchase":
      return (
        <svg {...common}>
          <circle cx="32" cy="32" r="22" fill="#e0f2fe" />
          <path d="M20 28h18l-2 12H22z" fill="#38bdf8" />
          <circle cx="24" cy="44" r="2" fill="#0369a1" />
          <circle cx="34" cy="44" r="2" fill="#0369a1" />
          <path d="M32 14v10M28 20l4 4 4-4" stroke="#0284c7" strokeWidth="2.4" fill="none" />
        </svg>
      );
    case "saleReturn":
      return (
        <svg {...common}>
          <circle cx="32" cy="32" r="22" fill="#e0f2fe" />
          <path d="M20 30h18l-2 12H22z" fill="#38bdf8" />
          <path d="M32 26V14M28 18l4-4 4 4" stroke="#0284c7" strokeWidth="2.4" fill="none" />
        </svg>
      );
    case "purchaseReturn":
      return (
        <svg {...common}>
          <circle cx="32" cy="32" r="22" fill="#ffedd5" />
          <path d="M20 30h18l-2 12H22z" fill="#fb923c" />
          <path d="M26 18l12 12M38 18L26 30" stroke="#c2410c" strokeWidth="2.4" />
        </svg>
      );
    case "prices":
      return (
        <svg {...common}>
          <circle cx="32" cy="32" r="22" fill="#cffafe" />
          <path d="M32 16v22" stroke="#0891b2" strokeWidth="3" />
          <path d="M24 30l8 8 8-8" fill="none" stroke="#0891b2" strokeWidth="3" />
          <circle cx="32" cy="22" r="4" fill="#22d3ee" />
        </svg>
      );
    case "pay":
      return (
        <svg {...common}>
          <path d="M10 34c8 2 12-6 16-6 3 6 8 8 14 4" fill="#fecaca" stroke="#ef4444" strokeWidth="2" />
          <circle cx="44" cy="24" r="10" fill="#fbbf24" />
          <text x="44" y="28" textAnchor="middle" fontSize="12" fontWeight="700" fill="#92400e">$</text>
        </svg>
      );
    case "receive":
      return (
        <svg {...common}>
          <path d="M22 28c0-8 20-8 20 0v14c0 8-20 8-20 0z" fill="#22d3ee" />
          <path d="M22 28h20" stroke="#0891b2" />
          <circle cx="32" cy="18" r="6" fill="#fbbf24" />
          <circle cx="24" cy="40" r="5" fill="#fde68a" />
          <circle cx="40" cy="42" r="4" fill="#fde68a" />
        </svg>
      );
    case "attendance":
      return (
        <svg {...common}>
          <rect x="16" y="10" width="32" height="42" rx="4" fill="#dbeafe" />
          <circle cx="32" cy="24" r="7" fill="#3b82f6" />
          <path d="M24 46c1-6 4-8 8-8s7 2 8 8" fill="#60a5fa" />
          <path d="M26 34l4 4 8-8" fill="none" stroke="#16a34a" strokeWidth="2.5" />
        </svg>
      );
    case "transfer":
      return (
        <svg {...common}>
          <rect x="16" y="22" width="32" height="24" rx="3" fill="#fbbf24" />
          <path d="M16 28h32M24 22l8-8 8 8" fill="#f59e0b" />
          <circle cx="44" cy="18" r="8" fill="#2563eb" />
          <text x="44" y="22" textAnchor="middle" fontSize="11" fontWeight="700" fill="white">1</text>
        </svg>
      );
    case "stats":
      return (
        <svg {...common}>
          <rect x="10" y="34" width="8" height="16" rx="2" fill="#60a5fa" />
          <rect x="22" y="24" width="8" height="26" rx="2" fill="#34d399" />
          <rect x="34" y="16" width="8" height="34" rx="2" fill="#fbbf24" />
          <circle cx="46" cy="22" r="10" fill="none" stroke="#6366f1" strokeWidth="3" />
          <path d="M52 28l6 6" stroke="#6366f1" strokeWidth="3" />
        </svg>
      );
    default:
      return null;
  }
}

export function MiniIcon({ d }: { d: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path d={d} fill="currentColor" />
    </svg>
  );
}
