/**
 * Finance Module Types
 *
 * Tipos centralizados para o módulo financeiro
 */

// ==========================================
// ENUMS
// ==========================================

export type TransactionType = "INCOME" | "EXPENSE";
export type TransactionStatus = "PENDING" | "PAID" | "OVERDUE";
export type CategoryType = "INCOME" | "EXPENSE";

// ==========================================
// BASE ENTITIES
// ==========================================

export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  openaiApiKey?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  initialBalance: number;
  currentBalance?: number; // Calculado
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Category {
  id: string;
  userId?: string | null;
  name: string;
  type: CategoryType;
  isDefault: boolean;
  color: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Tag {
  id: string;
  userId: string;
  name: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string;
  type: TransactionType;
  description: string;
  amount: number;
  dueDate: Date | string;
  paidDate?: Date | string | null;
  status: TransactionStatus;
  notes?: string | null;
  isRecurring: boolean;
  isFixed: boolean;
  installments?: number | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  dayOfMonth?: number | null;
  isOverride: boolean;
  overrideForDate?: Date | string | null;
  parentTransactionId?: string | null;
  cancelledOccurrences: string[];
  currentInstallment?: number | null;
  recurringRuleId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ==========================================
// RELATIONS
// ==========================================

export interface TransactionTag {
  tag: Tag;
  tagId: string;
}

export interface TransactionWithRelations extends Transaction {
  account: Account;
  category: Category;
  tags: TransactionTag[];
}

export interface AccountWithBalance extends Account {
  currentBalance: number;
}

// ==========================================
// VIRTUAL TRANSACTIONS
// ==========================================

export interface VirtualOccurrence {
  id: string; // ID virtual: "parentId::YYYY-MM" ou ID real para overrides
  realId: string | null; // ID real se for override, null se for virtual puro
  parentId: string; // ID da transação raiz
  userId: string;
  accountId: string;
  categoryId: string;
  type: TransactionType;
  description: string;
  amount: number;
  dueDate: Date; // Data calculada para este mês
  paidDate: Date | null;
  status: TransactionStatus;
  notes: string | null;
  isFixed: boolean;
  installments: number | null;
  currentInstallment: number | null; // Número da parcela (1, 2, 3...)
  isVirtual: boolean; // True se é ocorrência virtual, false se é override
  isOverride: boolean; // True se tem registro de override no banco
  account: Account;
  category: Category;
  tags: TransactionTag[];
}

export interface InstallmentInfo {
  totalInstallments: number;
  paidInstallments: number;
  pendingInstallments: number;
  currentInstallment: number;
  startDate: Date;
  endDate: Date;
  installmentAmount: number;
  totalAmount: number;
}

// ==========================================
// DASHBOARD & REPORTS
// ==========================================

export interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  pendingIncome: number;
  pendingExpense: number;
}

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  type: TransactionType;
  total: number;
  count: number;
  percentage: number;
}

export interface MonthlyData {
  month: number;
  year: number;
  income: number;
  expense: number;
  balance: number;
}

export interface AccountBalance {
  accountId: string;
  accountName: string;
  balance: number;
}

// ==========================================
// FILTERS & PARAMS
// ==========================================

export interface TransactionFilters {
  type?: TransactionType | "all";
  status?: TransactionStatus | "all";
  accountId?: string;
  categoryId?: string;
  tagIds?: string[];
  startDate?: Date | string;
  endDate?: Date | string;
  search?: string;
  isFixed?: boolean;
  isInstallment?: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface MonthYear {
  month: number; // 0-11
  year: number;
}

// ==========================================
// API RESPONSES
// ==========================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DeleteAccountInfo {
  hasTransactions: boolean;
  transactionCount: number;
  availableAccounts: Array<{ id: string; name: string; isDefault: boolean }>;
}

// ==========================================
// FORM DATA
// ==========================================

export interface TransactionFormData {
  accountId: string;
  categoryId: string;
  type: TransactionType;
  description: string;
  amount: number;
  dueDate: string;
  status: TransactionStatus;
  notes?: string;
  isFixed: boolean;
  installments?: number | null;
  tagIds: string[];
  scope?: "single" | "future" | "all";
}

export interface AccountFormData {
  name: string;
  initialBalance: number;
  isDefault?: boolean;
}

export interface CategoryFormData {
  name: string;
  type: CategoryType;
  color: string;
}

export interface TagFormData {
  name: string;
}

// ==========================================
// INVESTMENTS
// ==========================================

export type AssetType =
  | "STOCK"
  | "FII"
  | "CRYPTO"
  | "ETF"
  | "FIXED_INCOME"
  | "FUND";
export type InvestmentTransactionType =
  | "BUY"
  | "SELL"
  | "DIVIDEND"
  | "SPLIT"
  | "BONUS";

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  color: string;
  currency: string;
  isDefault: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  exchange?: string | null;
  sector?: string | null;
  currency: string;
  logoUrl?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Investment {
  id: string;
  portfolioId: string;
  assetId: string;
  quantity: number;
  averagePrice: number;
  totalInvested: number;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface InvestmentTransaction {
  id: string;
  investmentId: string;
  type: InvestmentTransactionType;
  quantity: number;
  price: number;
  totalValue: number;
  fees: number;
  date: Date | string;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AssetPriceHistory {
  id: string;
  assetId: string;
  date: Date | string;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close: number;
  volume?: number | null;
  createdAt: Date | string;
}

// Investment with relations
export interface InvestmentWithAsset extends Investment {
  asset: Asset;
}

export interface PortfolioWithInvestments extends Portfolio {
  investments: InvestmentWithAsset[];
}

// Market data types
export interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high?: number;
  low?: number;
  volume?: number;
  previousClose?: number;
  updatedAt: Date | string;
}

export interface InvestmentWithQuote extends InvestmentWithAsset {
  quote?: MarketQuote | null;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
}

export interface PortfolioSummary {
  portfolioId: string;
  totalInvested: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
  assetsCount: number;
}

export interface ProfitLoss {
  value: number;
  percent: number;
}

// Form data
export interface PortfolioFormData {
  name: string;
  description?: string;
  color: string;
  currency: string;
  isDefault?: boolean;
}

export interface InvestmentFormData {
  assetId: string;
  quantity: number;
  price: number;
  fees?: number;
  date: string;
  notes?: string;
}

export interface InvestmentTransactionFormData {
  type: InvestmentTransactionType;
  quantity: number;
  price: number;
  fees?: number;
  date: string;
  notes?: string;
}
