import Link from 'next/link';

import { CategoryLinks } from '@/components/category-links/category-links';
import { SearchForm } from '@/components/header/search-form';
import { MegaMenu } from '@/components/mega-menu/mega-menu';
import { MegaMenuMobile } from '@/components/mega-menu/mega-menu-mobile';

/**
 * Header — Server Component que só **compõe**. Ele não sabe como o mega menu
 * abre nem de onde vêm as categorias; cada peça é uma família própria em
 * `components/mega-menu` e `components/category-links`, e o header é o lugar
 * onde elas se encontram. Trocar a mecânica do menu não toca neste arquivo.
 *
 * O header aparece em TODA página, então cada byte de JS aqui é um imposto pago
 * no site inteiro. O inventário do que ele embarca:
 *
 * | Peça             | Ambiente | JS embarcado                       |
 * | ---------------- | -------- | ---------------------------------- |
 * | Header, logo     | server   | nenhum                             |
 * | CategoryLinks    | server   | nenhum (só o `<Link>` do Next)      |
 * | MegaMenu         | server   | nenhum — abre/fecha é CSS           |
 * | MegaMenuMobile   | server   | nenhum — `<details>` nativo         |
 * | CloseOnNavigate  | client   | ~10 linhas, renderiza `null`       |
 * | SearchForm       | server   | nenhum — form GET nativo            |
 *
 * Uma única ilha client no header, e ela não tem markup. É `sticky`, então o
 * `scroll-padding-top` do `globals.css` evita que âncoras caiam atrás da barra.
 */
export function Header() {
  return (
    // `sticky` (posicionado) é o bloco de contenção dos painéis `absolute` do
    // mega menu e do menu mobile — por isso eles ancoram no header, não nos
    // wrappers internos.
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[var(--background)]/90 backdrop-blur dark:border-white/15">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-5 sm:px-6">
        <MegaMenuMobile />

        <Link
          href="/"
          className="shrink-0 text-base font-bold tracking-tight text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-zinc-50"
        >
          fast<span className="font-normal text-zinc-500">commerce</span>
        </Link>

        <SearchForm className="max-w-xl" />

        <nav aria-label="Conta e carrinho" className="flex shrink-0 items-center gap-1">
          {/* TODO: rotas /conta e /carrinho ainda não existem. */}
          <Link
            href="/conta"
            prefetch={false}
            className="hidden size-9 place-items-center rounded-md hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 sm:grid dark:hover:bg-white/10"
            aria-label="Minha conta"
          >
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              className="size-5 fill-none stroke-current stroke-[1.5]"
            >
              <circle cx="8" cy="5.5" r="2.5" />
              <path d="M3 14c0-2.5 2.2-4 5-4s5 1.5 5 4" strokeLinecap="round" />
            </svg>
          </Link>

          <Link
            href="/carrinho"
            prefetch={false}
            className="grid size-9 place-items-center rounded-md hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/10"
            aria-label="Carrinho"
          >
            {/*
              Sem badge de quantidade: o contador depende de estado do
              usuário e viraria uma ilha client hidratando em toda página.
              Quando entrar, entra como ilha isolada (irmã, achando este link
              por id) — não transformando o header em client.
            */}
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              className="size-5 fill-none stroke-current stroke-[1.5]"
            >
              <path d="M2 3h1.6l1.6 7.5h7L14 5H4" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="6" cy="13" r="1" />
              <circle cx="11.5" cy="13" r="1" />
            </svg>
          </Link>
        </nav>
      </div>

      {/* Segunda linha, só desktop: o mega menu e os atalhos de categoria. */}
      <div className="mx-auto hidden max-w-7xl items-center gap-6 px-4 pb-3 sm:px-6 lg:flex">
        <MegaMenu />
        <CategoryLinks />
      </div>
    </header>
  );
}
