import Link from 'next/link';

import { CategoryColumns } from '@/components/mega-menu/category-columns';
import { CloseOnNavigate } from '@/components/mega-menu/close-on-navigate';
import { getCategoryTree } from '@/lib/categories';

const ID = 'mega-menu-mobile';

/**
 * O mesmo mega menu, outra casca — Server Component sobre `<details>/<summary>`.
 *
 * Hover não existe em touch, então o `<MegaMenu>` de desktop não serve aqui. O
 * que **é** compartilhado é o que importa: `<CategoryColumns>`, o conteúdo. As
 * duas cascas só decidem onde e quando ele aparece.
 *
 * `<details>` é o widget de disclosure nativo: abre e fecha sem JS, responde a
 * Enter/Espaço, e o browser já expõe `aria-expanded` correto na árvore de
 * acessibilidade. Um `useState` aqui não faria nada que o HTML não faça — só
 * cobraria hidratação em toda página.
 *
 * A única parcela de JS é o `<CloseOnNavigate>`, que não renderiza markup nenhum.
 */
export async function MegaMenuMobile() {
  const departamentos = await getCategoryTree();

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

      {/*
        Ancora no `<header>` (que é `sticky`, logo posicionado), não no
        `<details>`: o painel ocupa a largura toda abaixo da barra.
      */}
      <nav
        aria-label="Todas as categorias"
        className="absolute inset-x-0 top-full max-h-[calc(100dvh-100%)] overflow-y-auto border-b border-black/10 bg-[var(--background)] p-5 shadow-xl dark:border-white/15"
      >
        <CategoryColumns departments={departamentos} className="grid-cols-2 sm:grid-cols-3" />

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
