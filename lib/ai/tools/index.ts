// AI Tools - Central exports
// Estrutura organizada para fácil expansão

export {
  createMultipleTransactionsSchema,
  createTransactionSchema,
  executeCreateMultipleTransactions,
  executeCreateTransaction,
  executeGetInstallments,
  executeGetTransactions,
  executeGetTransactionsByCategory,
  executeGetTransactionsByMonth,
  getInstallmentsSchema,
  getTransactionsByCategorySchema,
  getTransactionsByMonthSchema,
  getTransactionsSchema,
} from "./transactions";

export { executeGetCategories, getCategoriesSchema } from "./categories";

export {
  executeGetAccountBalance,
  executeGetAccounts,
  getAccountBalanceSchema,
  getAccountsSchema,
} from "./accounts";

export {
  executeGetTags,
  executeGetTransactionsByTag,
  getTagsSchema,
  getTransactionsByTagSchema,
} from "./tags";

export {
  executeGetFinancialSummary,
  getFinancialSummarySchema,
} from "./summary";

export { executeMathOperation, mathOperationSchema } from "./math";
