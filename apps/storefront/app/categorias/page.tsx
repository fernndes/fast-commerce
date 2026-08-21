import { CategoryColumns } from '@/components/mega-menu/category-columns';
import { getCategoryTree } from '@/lib/categories';

export const revalidate = 3600;

export const metadata = {
  title: 'Todas as categorias — Fast Commerce',
};

// Destino do gatilho do mega menu — ver ADR 0017
// (adr/0017-mega-menu-css-puro-group-hover-focus-within.md), §3.1.
export default async function CategoriesPage() {
  const departments = await getCategoryTree();

  return (
    <main className="page-shell flex flex-1 flex-col gap-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Todas as categorias</h1>
      <CategoryColumns departments={departments} className="sm:grid-cols-2 lg:grid-cols-3" />
    </main>
  );
}
