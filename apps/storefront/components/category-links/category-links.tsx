import Link from 'next/link';

import { getFeaturedCategories } from '@/lib/categories';

// Barra horizontal de categorias em destaque — prefetch ligado, ver ADR 0011
// (adr/0011-convencao-prefetch-false-em-links-de-baixa-intencao.md).
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
