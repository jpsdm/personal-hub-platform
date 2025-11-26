import { z } from "zod";

// Schema para operações matemáticas
export const mathOperationSchema = z.object({
  operation: z
    .enum(["add", "subtract", "multiply", "divide", "percentage", "average"])
    .describe(
      "Tipo de operação: add (soma), subtract (subtração), multiply (multiplicação), divide (divisão), percentage (calcular porcentagem), average (média)"
    ),
  numbers: z
    .array(z.number())
    .min(1)
    .describe("Lista de números para a operação"),
  percentageOf: z
    .number()
    .optional()
    .describe(
      "Para operação 'percentage': o valor base do qual calcular a porcentagem (ex: 20% de 100)"
    ),
});

// Executar operação matemática
export async function executeMathOperation(
  params: z.infer<typeof mathOperationSchema>
) {
  const { operation, numbers, percentageOf } = params;

  let result: number;
  let formula: string;

  try {
    switch (operation) {
      case "add":
        result = numbers.reduce((acc, num) => acc + num, 0);
        formula = numbers.join(" + ");
        break;

      case "subtract":
        if (numbers.length < 2) {
          return {
            success: false,
            error: "Subtração requer pelo menos 2 números",
          };
        }
        result = numbers.reduce((acc, num, idx) =>
          idx === 0 ? num : acc - num
        );
        formula = numbers.join(" - ");
        break;

      case "multiply":
        result = numbers.reduce((acc, num) => acc * num, 1);
        formula = numbers.join(" × ");
        break;

      case "divide":
        if (numbers.length < 2) {
          return {
            success: false,
            error: "Divisão requer pelo menos 2 números",
          };
        }
        if (numbers.slice(1).some((n) => n === 0)) {
          return {
            success: false,
            error: "Divisão por zero não é permitida",
          };
        }
        result = numbers.reduce((acc, num, idx) =>
          idx === 0 ? num : acc / num
        );
        formula = numbers.join(" ÷ ");
        break;

      case "percentage":
        if (numbers.length !== 1) {
          return {
            success: false,
            error:
              "Para calcular porcentagem, forneça apenas 1 número (a porcentagem) e o valor base em 'percentageOf'",
          };
        }
        if (!percentageOf) {
          return {
            success: false,
            error:
              "Para calcular porcentagem, forneça o valor base em 'percentageOf'",
          };
        }
        const percentage = numbers[0];
        result = (percentage / 100) * percentageOf;
        formula = `${percentage}% de ${percentageOf}`;
        break;

      case "average":
        if (numbers.length === 0) {
          return {
            success: false,
            error: "Média requer pelo menos 1 número",
          };
        }
        result = numbers.reduce((acc, num) => acc + num, 0) / numbers.length;
        formula = `(${numbers.join(" + ")}) ÷ ${numbers.length}`;
        break;

      default:
        return {
          success: false,
          error: "Operação não suportada",
        };
    }

    // Arredondar para 2 casas decimais
    const roundedResult = Math.round(result * 100) / 100;

    return {
      success: true,
      operation,
      formula,
      result: roundedResult,
      formatted: roundedResult.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao calcular",
    };
  }
}
