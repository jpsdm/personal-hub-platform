/**
 * Virtual Transactions Library
 *
 * Este módulo gerencia transações virtuais - transações que existem conceitualmente
 * mas não são armazenadas individualmente no banco de dados.
 *
 * Tipos de transações virtuais:
 * 1. Parceladas: Uma transação raiz que representa N parcelas (ex: compra em 12x)
 * 2. Fixas: Uma transação raiz que se repete mensalmente indefinidamente
 *
 * Conceitos:
 * - Transação Raiz: Registro real no banco que define a série
 * - Ocorrência Virtual: Representação calculada para um mês específico
 * - Override: Registro real que sobrescreve uma ocorrência virtual específica
 */

import type {
  InstallmentInfo,
  TransactionStatus,
  TransactionWithRelations,
  VirtualOccurrence,
} from "../types";
import { LIMITS, TRANSACTION_STATUS, VIRTUAL_ID_SEPARATOR } from "./constants";

// ==========================================
// STATUS CALCULATION
// ==========================================

/**
 * Calcula o status correto de uma transação baseado na data de vencimento
 * Se a data de vencimento passou e não está paga, é OVERDUE
 */
function calculateVirtualStatus(
  dueDate: Date,
  isPaid: boolean
): TransactionStatus {
  if (isPaid) {
    return TRANSACTION_STATUS.PAID;
  }

  const today = new Date();
  today.setUTCHours(23, 59, 59, 999); // Final do dia atual em UTC

  // Comparar apenas as datas (ignorando horas)
  const dueDateOnly = new Date(
    Date.UTC(
      dueDate.getUTCFullYear(),
      dueDate.getUTCMonth(),
      dueDate.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );

  if (dueDateOnly < today) {
    return TRANSACTION_STATUS.OVERDUE;
  }

  return TRANSACTION_STATUS.PENDING;
}

// ==========================================
// VIRTUAL ID MANAGEMENT
// ==========================================

/**
 * Gera um ID virtual para uma ocorrência
 * Formato: "parentId::YYYY-MM"
 */
export function generateVirtualId(
  parentId: string,
  year: number,
  month: number
): string {
  const monthStr = String(month + 1).padStart(2, "0");
  return `${parentId}${VIRTUAL_ID_SEPARATOR}${year}-${monthStr}`;
}

/**
 * Verifica se um ID é virtual
 */
export function isVirtualId(id: string): boolean {
  return id.includes(VIRTUAL_ID_SEPARATOR);
}

/**
 * Extrai informações de um ID virtual
 */
export function parseVirtualId(
  virtualId: string
): { parentId: string; year: number; month: number } | null {
  if (!isVirtualId(virtualId)) {
    return null;
  }

  const [parentId, dateStr] = virtualId.split(VIRTUAL_ID_SEPARATOR);
  const [yearStr, monthStr] = dateStr.split("-");

  return {
    parentId,
    year: parseInt(yearStr, 10),
    month: parseInt(monthStr, 10) - 1, // Converter para 0-indexed
  };
}

/**
 * Gera a chave de ocorrência para uma data (formato "YYYY-MM")
 */
export function getOccurrenceKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// ==========================================
// DATE HELPERS
// ==========================================

/**
 * Obtém o último dia de um mês
 */
function getLastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * Calcula a data correta considerando meses com menos dias
 * Ex: Se o dia preferido é 31 e o mês tem 28 dias, usa 28
 */
function getAdjustedDate(
  year: number,
  month: number,
  preferredDay: number
): Date {
  const lastDay = getLastDayOfMonth(year, month);
  const actualDay = Math.min(preferredDay, lastDay);
  return new Date(Date.UTC(year, month, actualDay, 12, 0, 0));
}

/**
 * Verifica se uma data está dentro de um range
 */
function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  return date >= startDate && date <= endDate;
}

// ==========================================
// TRANSACTION EXPANSION
// ==========================================

/**
 * Expande uma transação raiz em suas ocorrências virtuais para um período
 */
export function expandTransaction(
  transaction: TransactionWithRelations,
  rangeStart: Date,
  rangeEnd: Date,
  overrides: Map<string, TransactionWithRelations> // Mapa de "YYYY-MM" -> override
): VirtualOccurrence[] {
  const occurrences: VirtualOccurrence[] = [];

  // Transação única (não é fixa nem parcelada)
  if (!transaction.isFixed && !transaction.installments) {
    const dueDate = new Date(transaction.dueDate);
    if (isDateInRange(dueDate, rangeStart, rangeEnd)) {
      // Recalcular status para garantir que transações atrasadas sejam marcadas como OVERDUE
      const isPaid =
        transaction.status === TRANSACTION_STATUS.PAID ||
        !!transaction.paidDate;
      const calculatedStatus = calculateVirtualStatus(dueDate, isPaid);

      occurrences.push({
        id: transaction.id,
        realId: transaction.id,
        parentId: transaction.id,
        userId: transaction.userId,
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        type: transaction.type as "INCOME" | "EXPENSE",
        description: transaction.description,
        amount: transaction.amount,
        dueDate: dueDate,
        paidDate: transaction.paidDate ? new Date(transaction.paidDate) : null,
        status: calculatedStatus,
        notes: transaction.notes || null,
        isFixed: false,
        installments: null,
        currentInstallment: null,
        isVirtual: false,
        isOverride: false,
        account: transaction.account,
        category: transaction.category,
        tags: transaction.tags,
      });
    }
    return occurrences;
  }

  // Data base e dia preferido para recorrência
  const baseDate = new Date(transaction.startDate || transaction.dueDate);
  const dayOfMonth = transaction.dayOfMonth || baseDate.getUTCDate();

  // Calcular período de geração
  const startYear = baseDate.getUTCFullYear();
  const startMonth = baseDate.getUTCMonth();

  // Para transações fixas: gera indefinidamente até o range solicitado
  // Para parcelas: gera apenas até o número de parcelas
  const isInstallment =
    transaction.installments && transaction.installments > 1;
  const maxInstallments = transaction.installments || Infinity;

  // Lista de ocorrências canceladas
  const cancelledSet = new Set(transaction.cancelledOccurrences || []);

  // Iterar pelos meses
  let installmentNumber = 0;
  let currentYear = startYear;
  let currentMonth = startMonth;

  while (true) {
    installmentNumber++;

    // Verificar limite de parcelas
    if (isInstallment && installmentNumber > maxInstallments) {
      break;
    }

    // Calcular data desta ocorrência
    const occurrenceDate = getAdjustedDate(
      currentYear,
      currentMonth,
      dayOfMonth
    );
    const occurrenceKey = getOccurrenceKey(occurrenceDate);

    // Verificar se está no range solicitado
    if (occurrenceDate > rangeEnd) {
      break; // Passou do range, parar
    }

    // Verificar se está cancelada
    if (!cancelledSet.has(occurrenceKey)) {
      // Verificar se está dentro do range
      if (occurrenceDate >= rangeStart) {
        // Verificar se existe override para esta ocorrência
        const override = overrides.get(occurrenceKey);

        if (override) {
          // Usar dados do override, mas recalcular status se não estiver pago
          const overrideDueDate = new Date(override.dueDate);
          const isPaid =
            override.status === TRANSACTION_STATUS.PAID || !!override.paidDate;
          const calculatedStatus = calculateVirtualStatus(
            overrideDueDate,
            isPaid
          );

          occurrences.push({
            id: override.id,
            realId: override.id,
            parentId: transaction.id,
            userId: override.userId,
            accountId: override.accountId,
            categoryId: override.categoryId,
            type: override.type as "INCOME" | "EXPENSE",
            description: override.description,
            amount: override.amount,
            dueDate: overrideDueDate,
            paidDate: override.paidDate ? new Date(override.paidDate) : null,
            status: calculatedStatus,
            notes: override.notes || null,
            isFixed: transaction.isFixed,
            installments: transaction.installments || null,
            currentInstallment: installmentNumber,
            isVirtual: false,
            isOverride: true,
            account: override.account,
            category: override.category,
            tags: override.tags,
          });
        } else {
          // Gerar ocorrência virtual
          // Calcular o status correto baseado na data de vencimento
          const virtualStatus = calculateVirtualStatus(occurrenceDate, false);

          occurrences.push({
            id: generateVirtualId(transaction.id, currentYear, currentMonth),
            realId: null,
            parentId: transaction.id,
            userId: transaction.userId,
            accountId: transaction.accountId,
            categoryId: transaction.categoryId,
            type: transaction.type as "INCOME" | "EXPENSE",
            description: transaction.description,
            amount: transaction.amount,
            dueDate: occurrenceDate,
            paidDate: null, // Ocorrências virtuais começam sem data de pagamento
            status: virtualStatus,
            notes: transaction.notes || null,
            isFixed: transaction.isFixed,
            installments: transaction.installments || null,
            currentInstallment: isInstallment ? installmentNumber : null,
            isVirtual: true,
            isOverride: false,
            account: transaction.account,
            category: transaction.category,
            tags: transaction.tags,
          });
        }
      }
    }

    // Próximo mês
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }

    // Limite de segurança: não gerar mais de N anos no futuro
    if (currentYear - startYear > LIMITS.YEARS_AHEAD_VIRTUAL) {
      break;
    }
  }

  return occurrences;
}

/**
 * Expande todas as transações para um período, considerando overrides
 */
export function expandTransactions(
  transactions: TransactionWithRelations[],
  rangeStart: Date,
  rangeEnd: Date
): VirtualOccurrence[] {
  const allOccurrences: VirtualOccurrence[] = [];

  // Separar transações raiz e overrides
  const rootTransactions: TransactionWithRelations[] = [];
  const overridesByParent = new Map<
    string,
    Map<string, TransactionWithRelations>
  >();

  for (const tx of transactions) {
    if (tx.isOverride && tx.parentTransactionId && tx.overrideForDate) {
      // É um override
      const parentId = tx.parentTransactionId;
      const occurrenceKey = getOccurrenceKey(new Date(tx.overrideForDate));

      if (!overridesByParent.has(parentId)) {
        overridesByParent.set(parentId, new Map());
      }
      overridesByParent.get(parentId)!.set(occurrenceKey, tx);
    } else if (!tx.parentTransactionId) {
      // É uma transação raiz (ou transação única)
      rootTransactions.push(tx);
    }
  }

  // Expandir cada transação raiz
  for (const rootTx of rootTransactions) {
    const overrides = overridesByParent.get(rootTx.id) || new Map();
    const occurrences = expandTransaction(
      rootTx,
      rangeStart,
      rangeEnd,
      overrides
    );
    allOccurrences.push(...occurrences);
  }

  return allOccurrences;
}

// ==========================================
// INSTALLMENT INFO
// ==========================================

/**
 * Calcula informações de uma série de parcelas
 */
export function getInstallmentInfo(
  transaction: TransactionWithRelations,
  overrides: TransactionWithRelations[],
  referenceDate: Date = new Date()
): InstallmentInfo | null {
  if (!transaction.installments || transaction.installments <= 1) {
    return null;
  }

  const baseDate = new Date(transaction.startDate || transaction.dueDate);
  const dayOfMonth = transaction.dayOfMonth || baseDate.getUTCDate();

  const totalInstallments = transaction.installments;
  const startDate = baseDate;

  // Calcular data final (último mês da série)
  const endYear =
    baseDate.getUTCFullYear() +
    Math.floor((baseDate.getUTCMonth() + totalInstallments - 1) / 12);
  const endMonth = (baseDate.getUTCMonth() + totalInstallments - 1) % 12;
  const endDate = getAdjustedDate(endYear, endMonth, dayOfMonth);

  // Criar mapa de overrides por mês
  const overrideMap = new Map<string, TransactionWithRelations>();
  for (const override of overrides) {
    if (override.overrideForDate) {
      const key = getOccurrenceKey(new Date(override.overrideForDate));
      overrideMap.set(key, override);
    }
  }

  // Calcular parcelas pagas
  let paidInstallments = 0;
  let currentInstallment = 0;
  const cancelledSet = new Set(transaction.cancelledOccurrences || []);

  let year = baseDate.getUTCFullYear();
  let month = baseDate.getUTCMonth();

  for (let i = 1; i <= totalInstallments; i++) {
    const occurrenceDate = getAdjustedDate(year, month, dayOfMonth);
    const occurrenceKey = getOccurrenceKey(occurrenceDate);

    if (!cancelledSet.has(occurrenceKey)) {
      const override = overrideMap.get(occurrenceKey);
      const status = override ? override.status : "PENDING";

      if (status === "PAID") {
        paidInstallments++;
      }

      // Determinar parcela atual (primeira pendente após ou igual à data de referência)
      if (
        currentInstallment === 0 &&
        occurrenceDate >= referenceDate &&
        status !== "PAID"
      ) {
        currentInstallment = i;
      }
    }

    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }

  // Se todas estão pagas ou passadas, a atual é a última
  if (currentInstallment === 0) {
    currentInstallment = totalInstallments;
  }

  return {
    totalInstallments,
    paidInstallments,
    pendingInstallments: totalInstallments - paidInstallments,
    currentInstallment,
    startDate,
    endDate,
    installmentAmount: transaction.amount,
    totalAmount: transaction.amount * totalInstallments,
  };
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Verifica se uma transação é recorrente (fixa ou parcelada)
 */
export function isRecurringTransaction(
  transaction: TransactionWithRelations
): boolean {
  return (
    transaction.isFixed ||
    (transaction.installments != null && transaction.installments > 1)
  );
}

/**
 * Verifica se uma transação é parcelada
 */
export function isInstallmentTransaction(
  transaction: TransactionWithRelations
): boolean {
  return transaction.installments != null && transaction.installments > 1;
}

/**
 * Verifica se uma transação é fixa
 */
export function isFixedTransaction(
  transaction: TransactionWithRelations
): boolean {
  return transaction.isFixed;
}

/**
 * Obtém o número total de parcelas de uma transação
 */
export function getTotalInstallments(
  transaction: TransactionWithRelations
): number | null {
  return transaction.installments ?? null;
}
