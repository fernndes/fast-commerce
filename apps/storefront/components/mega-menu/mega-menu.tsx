import Link from 'next/link';

import { CategoryColumns } from '@/components/mega-menu/category-columns';
import { getCategoryTree } from '@/lib/categories';

// Mega menu — Server Component, zero JS. Abrir/fechar é CSS puro
// (`group-hover`/`group-focus-within`), não estado — ver ADR 0017
// (adr/0017-mega-menu-css-puro-group-hover-focus-within.md).
export async function MegaMenu() {
  const departments = await getCategoryTree();

  return (
    <div className="group relative hidden lg:block">
      <Link
        href="/categorias"
        className="flex items-center gap-1.5 rounded-md py-1 text-sm font-semibold text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-zinc-50"
      >
        Todas as categorias
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          className="size-3.5 fill-none stroke-current stroke-[1.5] transition-transform duration-150 group-hover:rotate-180 group-focus-within:rotate-180"
        >
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>

      {/*
        `pt-3` é a ponte de hover: o respiro visual entre gatilho e painel fica
        DENTRO da área sensível, senão o mouse "cai" no vão e o menu fecha no
        meio do caminho.
      */}
      <div className="invisible absolute top-full left-0 z-50 pt-3 opacity-0 transition-[opacity,visibility] duration-150 delay-100 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <nav
          aria-label="Todas as categorias"
          className="max-h-[70vh] w-max max-w-[min(56rem,calc(100vw-3rem))] overflow-y-auto rounded-xl border border-black/10 bg-[var(--background)] p-6 shadow-xl dark:border-white/15"
        >
          <CategoryColumns departments={departments} className="grid-cols-3" />
        </nav>
      </div>
    </div>
  );
}
