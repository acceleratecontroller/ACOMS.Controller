import { prisma } from "@/lib/prisma";
import { CategoryManager } from "@/components/CategoryManager";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { tasks: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Categories</h1>
      <CategoryManager categories={categories} />
    </div>
  );
}
