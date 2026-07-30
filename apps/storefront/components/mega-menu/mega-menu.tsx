import Link from 'next/link';

import { CategoryColumns } from '@/components/mega-menu/category-columns';
import { getCategoryTree } from '@/lib/categories';

/**
 * Mega menu — Server Component, zero JS.
 *
 * O ADR 0001 já descartou "ilha client envolvendo o conteúdo": passar os
 * departamentos como `children` de um componente `'use client'` tiraria os
 * links do HTML servido e os jogaria no payload RSC. Num menu de navegação isso
 * custa caro duas vezes: perde-se o link rastreável (o motivo de o mega menu
 * existir para SEO) e o custo se repete em toda página, porque o header está em
 * todas.
 *
 * Então o estado abrir/fechar não é estado de React — é CSS:
 *
 * - `group-hover`  → abre no mouse (Tailwind já embrulha `hover` em
 *   `@media (hover: hover)`, então touch não dispara isso por acidente).
 * - `group-focus-within` → abre no teclado. O painel começa `invisible`, o que
 *   tira os links da ordem de tabulação; focar o gatilho torna o painel
 *   visível e os links passam a ser alcançáveis por Tab. Sair do último link
 *   fecha. Sem `useState`, sem hidratação, sem armadilha de foco.
 * - Touch: sem hover, tocar o gatilho **navega** para `/categorias`, a listagem
 *   completa. É a degradação correta — não um botão morto.
 *
 * O gatilho é um `<Link>`, não um `<button>`: ele tem destino próprio e funciona
 * antes de qualquer JS. Por isso também não há `aria-expanded` aqui — não existe
 * estado que o servidor possa declarar com honestidade no HTML.
 */
export function MegaMenu() {
  const departamentos = getCategoryTree();

  return (
    // `hidden lg:block`: hover só faz sentido onde há mouse. No mobile o mesmo
    // conteúdo aparece pelo `<MegaMenuMobile>`, também sem JS.
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
          <CategoryColumns departments={departamentos} className="grid-cols-3" />
        </nav>
      </div>
    </div>
  );
}
