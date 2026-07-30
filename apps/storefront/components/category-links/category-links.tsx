import Link from 'next/link';

import { getFeaturedCategories } from '@/lib/categories';

/**
 * Barra horizontal de categorias em destaque — Server Component, o caso mais
 * simples da divisão: é conteúdo e navegação, não interação.
 *
 * Não há estado nenhum aqui. Clicar num link navega, e navegação é do browser
 * (com transição client-side de brinde, via `<Link>`). Nada disso exige um
 * `'use client'`, então nenhum byte de lógica é enviado.
 *
 * Aqui o prefetch fica LIGADO (padrão): são poucos links, sempre visíveis, e
 * são justamente as rotas mais prováveis do site. É o inverso do painel do mega
 * menu, onde ~30 links com prefetch viravam 30 requests inúteis por página.
 */
export async function CategoryLinks({ className = '' }: { className?: string }) {
  const categorias = await getFeaturedCategories();

  return (
    <nav aria-label="Categorias em destaque">
      <ul className={`flex items-center gap-5 ${className}`}>
        {categorias.map((categoria) => (
          <li key={categoria.slug}>
            <Link
              href={categoria.href}
              className="text-sm whitespace-nowrap text-zinc-600 hover:text-zinc-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              {categoria.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
