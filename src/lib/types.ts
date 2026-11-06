export type ScreenId =
  | "home"
  | "sale"
  | "purchase"
  | "saleReturn"
  | "purchaseReturn"
  | "prices"
  | "products"
  | "customers"
  | "suppliers"
  | "employees"
  | "treasury"
  | "expenses"
  | "cashOut"
  | "cashIn"
  | "attendance"
  | "transfers"
  | "stats"
  | "warehouses"
  | "accounts"
  | "reports"
  | "settings"
  | "maintenance"
  | "install"
  | "statement"
  | "installments"
  | "profits"
  | "contact";

export type SettingsDTO = {
  id: number;
  storeName: string;
  activity: string;
  phone: string;
  phone2: string | null;
  website: string | null;
  email: string | null;
  address: string | null;
  taxPercent: number;
  allowNegative: boolean;
  autoFillPaid: boolean;
  footerNote: string | null;
  cashierName: string;
  currency: string;
  season: string;
  installmentMonths: number;
  downPercent: number;
  lateFee: number;
  returnDays: number;
  bookReturnDays: number;
  defaultPayment: string;
  theme: string;
  loginUser: string;
};

export type InstallmentDTO = {
  id: number;
  number: number;
  customerId: number;
  customerName: string;
  createdAt: string;
  total: number;
  downPayment: number;
  months: number;
  monthlyAmount: number;
  paidAmount: number;
  status: string;
  notes: string | null;
};

export type DueDTO = {
  id: number;
  planId: number;
  dueNo: number;
  dueDate: string;
  amount: number;
  paid: number;
  status: string;
};

export type CategoryDTO = {
  id: number;
  name: string;
  color: string;
  sortOrder: number;
  kind: string;
};

export type StockDTO = { warehouseId: number; qty: number };

export type ProductDTO = {
  id: number;
  code: string;
  name: string;
  categoryId: number;
  unit: string;
  costPrice: number;
  salePrice: number;
  wholesalePrice: number;
  taxPercent: number;
  minStock: number;
  grade: string | null;
  subject: string | null;
  stage: string | null;
  publisher: string | null;
  active: boolean;
  stocks: StockDTO[];
};

export type WarehouseDTO = {
  id: number;
  name: string;
  isDefault: boolean;
  notes: string | null;
};

export type CustomerDTO = {
  id: number;
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  balance: number;
  priceType: string;
  isSystem: boolean;
  notes: string | null;
};

export type SupplierDTO = {
  id: number;
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  balance: number;
  notes: string | null;
};

export type EmployeeDTO = {
  id: number;
  code: string;
  name: string;
  jobTitle: string;
  phone: string | null;
  salary: number;
  hireDate: string | null;
  active: boolean;
};

export type TreasuryDTO = {
  id: number;
  name: string;
  balance: number;
  kind: string;
};

export type DocDTO = {
  id: number;
  docType: string;
  number: number;
  createdAt: string;
  partyId: number | null;
  partyName: string;
  warehouseId: number;
  treasuryId: number | null;
  paymentType: string;
  priceType: string;
  discountPercent: number;
  discountAmount: number;
  taxAmount: number;
  deliveryFee: number;
  subtotal: number;
  total: number;
  paid: number;
  changeAmount: number;
  previousBalance: number;
  notes: string | null;
  status: string;
  cashier: string;
  sourceInvoiceId: number | null;
};

export type DocItemDTO = {
  id: number;
  documentId: number;
  productId: number;
  code: string;
  name: string;
  unit: string;
  qty: number;
  unitPrice: number;
  costPrice: number;
  taxPercent: number;
  lineTotal: number;
};

export type CashMoveDTO = {
  id: number;
  createdAt: string;
  treasuryId: number;
  direction: string;
  amount: number;
  source: string;
  partyName: string | null;
  notes: string | null;
  refId: number | null;
};

export type ExpenseDTO = {
  id: number;
  createdAt: string;
  category: string;
  amount: number;
  treasuryId: number;
  notes: string | null;
  employeeId: number | null;
};

export type AttendanceDTO = {
  id: number;
  employeeId: number;
  day: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
};

export type TransferDTO = {
  id: number;
  number: number;
  createdAt: string;
  fromWarehouseId: number;
  toWarehouseId: number;
  notes: string | null;
  status: string;
  items?: { productId: number; name: string; code: string; qty: number }[];
};

export type MessageDTO = {
  id: number;
  createdAt: string;
  name: string;
  phone: string | null;
  body: string;
};

export type ShiftDTO = {
  id: number;
  createdAt: string;
  treasuryId: number;
  systemBalance: number;
  counted: number;
  difference: number;
  notes: string | null;
  cashier: string;
};

export type TopProduct = { name: string; qty: number; total: number };
export type DayPoint = { day: string; total: number };

export type StatsDTO = {
  todaySales: number;
  todayProfit: number;
  todayInvoices: number;
  monthSales: number;
  monthPurchases: number;
  monthProfit: number;
  customerDebt: number;
  supplierDebt: number;
  stockValue: number;
  lowStock: { id: number; name: string; code: string; qty: number; minStock: number }[];
  topProducts: TopProduct[];
  salesByDay: DayPoint[];
  suspended: number;
};

export type RecentPrice = {
  customerId: number;
  productId: number;
  unitPrice: number;
};

export type BootstrapData = {
  settings: SettingsDTO;
  recentPrices: RecentPrice[];
  categories: CategoryDTO[];
  products: ProductDTO[];
  warehouses: WarehouseDTO[];
  customers: CustomerDTO[];
  suppliers: SupplierDTO[];
  employees: EmployeeDTO[];
  treasuries: TreasuryDTO[];
  documents: DocDTO[];
  cashMoves: CashMoveDTO[];
  expenses: ExpenseDTO[];
  attendance: AttendanceDTO[];
  transfers: TransferDTO[];
  messages: MessageDTO[];
  shifts: ShiftDTO[];
  installments: InstallmentDTO[];
  dues: DueDTO[];
  stats: StatsDTO;
  nextNumbers: Record<string, number>;
  serverTime: string;
};

export type LineInput = {
  productId: number;
  qty: number;
  unitPrice: number;
  taxPercent: number;
};

export type DocInput = {
  id?: number;
  docType: "sale" | "purchase" | "saleReturn" | "purchaseReturn";
  partyId: number | null;
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
  sourceInvoiceId?: number | null;
  lines: LineInput[];
  suspend?: boolean;
};
