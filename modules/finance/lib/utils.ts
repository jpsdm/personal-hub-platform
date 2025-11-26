/**
 * Finance Module Utils
 *
 * Funções utilitárias para o módulo financeiro
 */

import type { DateRange, MonthYear, TransactionStatus } from "../types";
import { CURRENCY, MONTH_NAMES, TRANSACTION_STATUS } from "./constants";

// ==========================================
// CURRENCY FORMATTING
// ==========================================

/**
 * Formata um valor numérico como moeda brasileira (BRL)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(CURRENCY.locale, {
    style: "currency",
    currency: CURRENCY.code,
  }).format(value);
}

/**
 * Formata valor como moeda sem o símbolo
 */
export function formatCurrencyValue(value: number): string {
  return new Intl.NumberFormat(CURRENCY.locale, {
    minimumFractionDigits: CURRENCY.decimalPlaces,
    maximumFractionDigits: CURRENCY.decimalPlaces,
  }).format(value);
}

/**
 * Parse de string de moeda para número
 */
export function parseCurrency(value: string): number {
  // Remove tudo exceto números, vírgula e ponto
  const cleanValue = value.replace(/[^\d,.-]/g, "");
  // Converte vírgula para ponto
  const normalized = cleanValue.replace(",", ".");
  return parseFloat(normalized) || 0;
}

// ==========================================
// DATE FORMATTING
// ==========================================

/**
 * Formata uma data para o padrão brasileiro (DD/MM/YYYY)
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Formata uma data para exibição curta (DD/MM)
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

/**
 * Formata uma data para formato ISO (YYYY-MM-DD)
 */
export function formatDateISO(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

/**
 * Formata mês e ano (ex: "Janeiro de 2025")
 */
export function formatMonthYear(month: number, year: number): string {
  return `${MONTH_NAMES[month]} de ${year}`;
}

/**
 * Formata mês e ano curto (ex: "Jan/2025")
 */
export function formatMonthYearShort(month: number, year: number): string {
  return `${MONTH_NAMES[month].substring(0, 3)}/${year}`;
}

// ==========================================
// DATE CALCULATIONS
// ==========================================

/**
 * Obtém mês e ano de uma data
 */
export function getMonthYear(date: Date): MonthYear {
  return {
    month: date.getMonth(),
    year: date.getFullYear(),
  };
}

/**
 * Obtém o range de datas de um mês
 */
export function getMonthRange(month: number, year: number): DateRange {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Obtém o primeiro dia do mês
 */
export function getFirstDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Obtém o último dia do mês
 */
export function getLastDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Adiciona meses a uma data
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Verifica se duas datas são do mesmo mês
 */
export function isSameMonth(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth()
  );
}

/**
 * Verifica se uma data está no passado
 */
export function isPastDate(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

/**
 * Verifica se uma data é hoje
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

// ==========================================
// TRANSACTION STATUS
// ==========================================

/**
 * Calcula o status de uma transação baseado na data de pagamento e vencimento
 */
export function calculateTransactionStatus(
  paidDate: Date | null,
  dueDate: Date
): TransactionStatus {
  if (paidDate) {
    return TRANSACTION_STATUS.PAID;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  if (due < today) {
    return TRANSACTION_STATUS.OVERDUE;
  }

  return TRANSACTION_STATUS.PENDING;
}

/**
 * Verifica se uma transação está paga
 */
export function isPaid(status: TransactionStatus): boolean {
  return status === TRANSACTION_STATUS.PAID;
}

/**
 * Verifica se uma transação está pendente
 */
export function isPending(status: TransactionStatus): boolean {
  return status === TRANSACTION_STATUS.PENDING;
}

/**
 * Verifica se uma transação está atrasada
 */
export function isOverdue(status: TransactionStatus): boolean {
  return status === TRANSACTION_STATUS.OVERDUE;
}

// ==========================================
// PERCENTAGE CALCULATIONS
// ==========================================

/**
 * Calcula a porcentagem de um valor em relação ao total
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Calcula a variação percentual entre dois valores
 */
export function calculateVariation(
  current: number,
  previous: number
): { value: number; isPositive: boolean } {
  if (previous === 0) {
    return { value: current > 0 ? 100 : 0, isPositive: current >= 0 };
  }
  const variation = ((current - previous) / Math.abs(previous)) * 100;
  return { value: Math.abs(variation), isPositive: variation >= 0 };
}

// ==========================================
// STRING UTILS
// ==========================================

/**
 * Trunca uma string para um tamanho máximo
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + "...";
}

/**
 * Capitaliza a primeira letra de uma string
 */
export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ==========================================
// INSTALLMENT UTILS
// ==========================================

/**
 * Formata descrição de parcela
 * Ex: "Netflix (2/12)" ou "Aluguel (Fixo)"
 */
export function formatInstallmentDescription(
  description: string,
  currentInstallment: number | null,
  totalInstallments: number | null,
  isFixed: boolean
): string {
  if (isFixed) {
    return `${description} (Fixo)`;
  }

  if (currentInstallment && totalInstallments) {
    return `${description} (${currentInstallment}/${totalInstallments})`;
  }

  return description;
}

/**
 * Calcula o valor total de parcelas
 */
export function calculateTotalInstallments(
  amount: number,
  installments: number
): number {
  return amount * installments;
}

// ==========================================
// BALANCE UTILS
// ==========================================

/**
 * Calcula o saldo (receitas - despesas)
 */
export function calculateBalance(income: number, expense: number): number {
  return income - expense;
}

/**
 * Verifica se o saldo é positivo
 */
export function isPositiveBalance(balance: number): boolean {
  return balance >= 0;
}

// ==========================================
// COLOR UTILS
// ==========================================

/**
 * Obtém uma cor aleatória de uma lista
 */
export function getRandomColor(colors: readonly string[]): string {
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Converte hex para rgba
 */
export function hexToRgba(hex: string, alpha: number = 1): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
