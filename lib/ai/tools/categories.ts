import { prisma } from "@/lib/db";
import { z } from "zod";

// Schema para parâmetros de categorias
export const getCategoriesSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]).optional().describe("Tipo da categoria"),
});

// Função de execução
export async function executeGetCategories(
  userId: string,
  params: z.infer<typeof getCategoriesSchema>
) {
  const { type } = params;

  const where: Record<string, unknown> = {
    OR: [{ userId }, { userId: null, isDefault: true }],
  };

  if (type) where.type = type;

  const categories = await prisma.category.findMany({
    where,
    select: {
      id: true,
      name: true,
      type: true,
      color: true,
      isDefault: true,
    },
    orderBy: { name: "asc" },
  });

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    color: c.color,
    isDefault: c.isDefault,
  }));
}
