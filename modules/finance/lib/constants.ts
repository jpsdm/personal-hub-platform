/**
 * Finance Module Constants
 *
 * Constantes e enums centralizados para o módulo financeiro
 */

// ==========================================
// TRANSACTION TYPES
// ==========================================

export const TRANSACTION_TYPES = {
  INCOME: "INCOME",
  EXPENSE: "EXPENSE",
} as const;

export const TRANSACTION_TYPE_LABELS = {
  INCOME: "Receita",
  EXPENSE: "Despesa",
} as const;

export const TRANSACTION_TYPE_ICONS = {
  INCOME: "💰",
  EXPENSE: "💸",
} as const;

export const TRANSACTION_TYPE_COLORS = {
  INCOME: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
    solid: "#22c55e",
  },
  EXPENSE: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    solid: "#ef4444",
  },
} as const;

// ==========================================
// TRANSACTION STATUS
// ==========================================

export const TRANSACTION_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
} as const;

export const TRANSACTION_STATUS_LABELS = {
  PENDING: "Pendente",
  PAID: "Pago",
  OVERDUE: "Atrasado",
} as const;

export const TRANSACTION_STATUS_ICONS = {
  PENDING: "⏳",
  PAID: "✅",
  OVERDUE: "⚠️",
} as const;

export const TRANSACTION_STATUS_COLORS = {
  PENDING: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-400",
    border: "border-yellow-200 dark:border-yellow-800",
    badge: "bg-yellow-500",
  },
  PAID: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
    badge: "bg-green-500",
  },
  OVERDUE: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    badge: "bg-red-500",
  },
} as const;

// ==========================================
// CATEGORY COLORS
// ==========================================

export const CATEGORY_COLORS = {
  INCOME: ["#22c55e", "#10b981", "#059669", "#14b8a6", "#0d9488"],
  EXPENSE: [
    "#ef4444",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#f97316",
    "#6366f1",
    "#84cc16",
  ],
} as const;

export const DEFAULT_CATEGORY_COLORS = [
  "#ef4444", // red
  "#f59e0b", // amber
  "#22c55e", // green
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#6366f1", // indigo
  "#84cc16", // lime
  "#14b8a6", // teal
  "#a855f7", // purple
] as const;

// ==========================================
// DATE & TIME
// ==========================================

export const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export const MONTH_NAMES_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

export const WEEKDAY_NAMES = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

export const WEEKDAY_NAMES_SHORT = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
] as const;

// ==========================================
// CURRENCY
// ==========================================

export const CURRENCY = {
  code: "BRL",
  symbol: "R$",
  locale: "pt-BR",
  decimalSeparator: ",",
  thousandSeparator: ".",
  decimalPlaces: 2,
} as const;

// ==========================================
// LIMITS & DEFAULTS
// ==========================================

export const LIMITS = {
  MAX_INSTALLMENTS: 48,
  MIN_INSTALLMENTS: 2,
  MAX_DESCRIPTION_LENGTH: 255,
  MAX_NOTES_LENGTH: 1000,
  MAX_CATEGORY_NAME_LENGTH: 50,
  MAX_ACCOUNT_NAME_LENGTH: 50,
  MAX_TAG_NAME_LENGTH: 30,
  YEARS_AHEAD_VIRTUAL: 10,
} as const;

export const DEFAULTS = {
  ACCOUNT_COLOR: "#3B82F6",
  CATEGORY_COLOR: "#6B7280",
  TRANSACTION_STATUS: "PAID" as const,
  TRANSACTION_TYPE: "EXPENSE" as const,
} as const;

// ==========================================
// FILTER OPTIONS
// ==========================================

export const FILTER_TYPE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "INCOME", label: "Receitas" },
  { value: "EXPENSE", label: "Despesas" },
] as const;

export const FILTER_STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "PAID", label: "Pagos" },
  { value: "PENDING", label: "Pendentes" },
  { value: "OVERDUE", label: "Atrasados" },
] as const;

export const FILTER_RECURRENCE_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "single", label: "Únicas" },
  { value: "fixed", label: "Fixas" },
  { value: "installment", label: "Parceladas" },
] as const;

// ==========================================
// EDIT SCOPE OPTIONS
// ==========================================

export const EDIT_SCOPE_OPTIONS = [
  {
    value: "single",
    label: "Apenas esta ocorrência",
    description: "Modifica somente esta transação específica",
  },
  {
    value: "future",
    label: "Esta e futuras",
    description: "Modifica esta e todas as ocorrências futuras",
  },
  {
    value: "all",
    label: "Toda a série",
    description: "Modifica todas as ocorrências (passadas e futuras)",
  },
] as const;

// ==========================================
// API ENDPOINTS
// ==========================================

export const API_ENDPOINTS = {
  ACCOUNTS: "/api/accounts",
  CATEGORIES: "/api/categories",
  TAGS: "/api/tags",
  TRANSACTIONS: "/api/transactions",
  DASHBOARD: "/api/dashboard",
  SETTINGS: "/api/settings",
} as const;

// ==========================================
// VIRTUAL TRANSACTION CONSTANTS
// ==========================================

export const VIRTUAL_ID_SEPARATOR = "::" as const;
