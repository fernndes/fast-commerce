import { notFound } from 'next/navigation';

import { ProductCard } from '@/components/shelf/product-card';
import { findCategory, getAllCategorySlugs, getProductsByCategory } from '@/lib/categories';

export const revalidate = 3600;

/**
 * Uma rota serve departamento (`/categorias/alimentacao`) e subcategoria
 * (`/categorias/seca`) — `findCategory` resolve os dois. Prerenderizar todos
 * evita render dinâmico no clique e deixa o `<Link>` prefetchar a rota inteira.
 */
export async function generateStaticParams() {
  return getAllCategorySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categoria = findCategory(slug);
  return { title: categoria ? `${categoria.name} — Fast Commerce` : 'Categoria não encontrada' };
}

export default async function Categoria({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const categoria = findCategory(slug);
  if (!categoria) notFound();

  const produtos = getProductsByCategory(slug);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{categoria.name}</h1>
        <p className="text-sm text-zinc-500">
          {produtos.length} {produtos.length === 1 ? 'produto' : 'produtos'}
        </p>
      </header>

      {/*
        As colunas casam com o `sizes` do ProductCard (23vw / 38vw / 60vw), o
        mesmo acoplamento que o ADR 0001 já registra: mudar uma coisa exige
        mudar a outra.
      */}
      <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {produtos.map((produto) => (
          <li key={produto.id}>
            <ProductCard product={produto} />
          </li>
        ))}
      </ul>
    </main>
  );
}
