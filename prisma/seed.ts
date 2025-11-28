import { prisma } from "@/lib/db";

enum CategoryType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
}

async function main() {
  const defaultCategories = [
    // INCOME
    { name: "Salário", type: CategoryType.INCOME, color: "#22C55E" },
    { name: "Investimentos", type: CategoryType.INCOME, color: "#16A34A" },
    { name: "Presente", type: CategoryType.INCOME, color: "#4ADE80" },
    { name: "Reembolso", type: CategoryType.INCOME, color: "#15803D" },
    { name: "Outros", type: CategoryType.INCOME, color: "#10B981" },

    // EXPENSE
    { name: "Alimentação", type: CategoryType.EXPENSE, color: "#EF4444" },
    { name: "Moradia", type: CategoryType.EXPENSE, color: "#DC2626" },
    { name: "Transporte", type: CategoryType.EXPENSE, color: "#F97316" },
    { name: "Saúde", type: CategoryType.EXPENSE, color: "#F43F5E" },
    { name: "Educação", type: CategoryType.EXPENSE, color: "#EAB308" },
    { name: "Lazer", type: CategoryType.EXPENSE, color: "#A855F7" },
    { name: "Compras", type: CategoryType.EXPENSE, color: "#3B82F6" },
    { name: "Serviços", type: CategoryType.EXPENSE, color: "#6366F1" },
    { name: "Viagens", type: CategoryType.EXPENSE, color: "#10B981" },
    { name: "Investimentos", type: CategoryType.EXPENSE, color: "#14B8A6" },
    { name: "Outros", type: CategoryType.EXPENSE, color: "#6B7280" },
  ].map((c) => ({
    ...c,
    isDefault: true,
    userId: null,
  }));

  const count = await prisma.category.count();
  if (count > 0) {
    console.log("✅ Categorias já existem, pulando seed.");
    return;
  }

  await prisma.category.createMany({
    data: defaultCategories,
    skipDuplicates: true, // evita duplicatas por unique(name, userId)
  });

  console.log("✅ Categorias padrão seedadas com sucesso");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
