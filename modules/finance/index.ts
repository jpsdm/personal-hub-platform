// Components
export { AccountDialog } from "./components/account-dialog";
export { AccountsList } from "./components/accounts-list";
export { AiChat } from "./components/ai-chat";
export { CategoriesList } from "./components/categories-list";
export { CategoryDialog } from "./components/category-dialog";
export { DashboardCharts } from "./components/dashboard-charts";
export { DistributionSummary } from "./components/distribution-summary";
export { InvestmentDialog } from "./components/investment-dialog";
export { InvestmentList } from "./components/investment-list";
export { InvestmentTransactionDialog } from "./components/investment-transaction-dialog";
export { PortfolioCharts } from "./components/portfolio-charts";
export { PortfolioDialog } from "./components/portfolio-dialog";
export { PortfolioList } from "./components/portfolio-list";
export { ReceiptGenerator } from "./components/receipt-generator";
export { SettingsDialog } from "./components/settings-dialog";
export { TagDialog } from "./components/tag-dialog";
export { TagsList } from "./components/tags-list";
export { TransactionDialog } from "./components/transaction-dialog";
export {
  TransactionFilters,
  type TransactionFiltersState,
} from "./components/transaction-filters";
export { TransactionsList } from "./components/transactions-list";

// Types
export type {
  Account,
  Asset,
  Category,
  DateRange,
  DeleteAccountInfo,
  Investment,
  InvestmentFormData,
  InvestmentTransaction,
  InvestmentTransactionFormData,
  InvestmentWithAsset,
  MarketQuote,
  MonthYear,
  Portfolio,
  PortfolioFormData,
  PortfolioWithInvestments,
  ProfitLoss,
  Tag,
  Transaction,
  TransactionStatus,
  TransactionWithRelations,
  VirtualOccurrence,
} from "./types";

// Constants
export {
  API_ENDPOINTS,
  ASSET_TYPES,
  ASSET_TYPE_COLORS,
  ASSET_TYPE_LABELS,
  CURRENCY,
  DEFAULTS,
  DEFAULT_CATEGORY_COLORS,
  DEFAULT_PORTFOLIO_COLORS,
  EXCHANGES,
  INVESTMENT_API_ENDPOINTS,
  INVESTMENT_TRANSACTION_TYPES,
  INVESTMENT_TRANSACTION_TYPE_COLORS,
  INVESTMENT_TRANSACTION_TYPE_LABELS,
  LIMITS,
  MARKET_REFRESH_INTERVALS,
  MONTH_NAMES,
  MONTH_NAMES_SHORT,
  TRANSACTION_STATUS,
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
} from "./lib/constants";

// Utils
export {
  calculateTransactionStatus,
  formatCurrency,
  formatDate,
  getMonthRange,
  getMonthYear,
  parseCurrency,
} from "./lib/utils";

// Virtual Transactions
export {
  expandTransaction,
  expandTransactions,
  generateVirtualId,
  getInstallmentInfo,
  isVirtualId,
  parseVirtualId,
} from "./lib/virtual-transactions";

// Hooks
export { useReceiptGenerator } from "./hooks/use-receipt-generator";

// Market API
export {
  calculateAveragePrice,
  calculateProfitLoss,
  detectAssetType,
  getQuote,
  getQuotes,
  searchAssets,
} from "./lib/market-api";
