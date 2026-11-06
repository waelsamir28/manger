import { r2 } from "./format";

export type CalcLine = {
  qty: number;
  unitPrice: number;
  taxPercent: number;
};

export function calcDocument(input: {
  lines: CalcLine[];
  discountPercent: number;
  discountAmount: number;
  deliveryFee: number;
  globalTaxPercent: number;
  paid: number;
}) {
  const subtotal = r2(input.lines.reduce((sum, line) => sum + Number(line.qty) * Number(line.unitPrice), 0));
  const lineTax = r2(
    input.lines.reduce(
      (sum, line) => sum + (Number(line.qty) * Number(line.unitPrice) * Number(line.taxPercent || 0)) / 100,
      0,
    ),
  );
  const percentDiscount = r2((subtotal * Number(input.discountPercent || 0)) / 100);
  const discount = r2(Math.min(subtotal, Number(input.discountAmount || 0) > 0 ? Number(input.discountAmount) : percentDiscount));
  const afterDiscount = r2(Math.max(0, subtotal - discount));
  const tax = r2(lineTax > 0 ? lineTax : (afterDiscount * Number(input.globalTaxPercent || 0)) / 100);
  const delivery = r2(Number(input.deliveryFee || 0));
  const total = r2(Math.max(0, afterDiscount + tax + delivery));
  const paid = r2(Math.max(0, Number(input.paid || 0)));
  const change = r2(Math.max(0, paid - total));
  const remaining = r2(Math.max(0, total - paid));
  const qty = r2(input.lines.reduce((sum, line) => sum + Number(line.qty || 0), 0));
  return {
    subtotal,
    discount,
    tax,
    delivery,
    total,
    paid,
    change,
    remaining,
    qty,
    count: input.lines.length,
    gross: subtotal,
  };
}
