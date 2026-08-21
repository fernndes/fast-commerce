import Link from 'next/link';

import { CategoryColumns } from '@/components/mega-menu/category-columns';
import { CloseOnNavigate } from '@/components/mega-menu/close-on-navigate';
import { getCategoryTree } from '@/lib/categories';

const ID = 'mega-menu-mobile';

// O mesmo mega menu, outra casca — `<details>/<summary>`, sem `useState`. Ver
// ADR 0017 (adr/0017-mega-menu-css-puro-group-hover-focus-within.md), §3.1.
export async function MegaMenuMobile() {
  const departments = await getCategoryTree();

  return (
    <details id={ID} className="group lg:hidden">
      <summary
        aria-label="Abrir menu de categorias"
        className="grid size-9 cursor-pointer place-items-center rounded-md list-none hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/10 [&::-webkit-details-marker]:hidden"
      >
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          className="size-5 fill-none stroke-current stroke-[1.5]"
        >
          <g className="group-open:hidden">
            <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
          </g>
          <g className="hidden group-open:block">
            <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
          </g>
        </svg>
      </summary>

      {/* Ancora no `<header>` sticky, não no `<details>` — ver ADR 0017, §5.1. */}
      <nav
        aria-label="Todas as categorias"
        className="absolute inset-x-0 top-full max-h-[calc(100dvh-100%)] overflow-y-auto border-b border-black/10 bg-[var(--background)] p-5 shadow-xl dark:border-white/15"
      >
        <CategoryColumns departments={departments} className="grid-cols-2 sm:grid-cols-3" />

        <Link
          href="/categorias"
          prefetch={false}
          className="mt-6 inline-block text-sm font-semibold text-zinc-950 underline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-zinc-50"
        >
          Ver todas as categorias
        </Link>
      </nav>

      <CloseOnNavigate targetId={ID} />
    </details>
  );
}
