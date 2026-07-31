import { CategoryColumns } from '@/components/mega-menu/category-columns';
import { getCategoryTree } from '@/lib/categories';

export const revalidate = 3600;

export const metadata = {
  title: 'Todas as categorias — Fast Commerce',
};

/**
 * Destino do gatilho do mega menu. É o que o usuário de touch vê ao tocar
 * "Todas as categorias" (onde não há hover) e o que o crawler encontra ao
 * seguir aquele link — a árvore inteira em HTML, num só lugar.
 */
export default async function Categorias() {
  const departamentos = await getCategoryTree();

  return (
    <main className="page-shell flex flex-1 flex-col gap-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Todas as categorias</h1>
      <CategoryColumns departments={departamentos} className="sm:grid-cols-2 lg:grid-cols-3" />
    </main>
  );
}
