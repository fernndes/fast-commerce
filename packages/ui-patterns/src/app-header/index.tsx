import { Brand } from '@repo/ui/brand';
import { AccountIcon, CartIcon, ChevronDownIcon, MenuToggleIcon } from '@repo/ui/icon';
import { NavList } from '@repo/ui/nav-list';
import { SearchForm } from '@repo/ui/search-form';
import {
  barBg,
  border,
  fgText,
  fgTextHover,
  focusRing,
  hoverBg,
  mutedText,
  panelShadow,
  railWidth,
  surfaceBg,
} from '@repo/ui/tokens';

import type { NavCategory, NavDepartment, NavZone } from '../types';

import { CategoryColumns } from './category-columns';
import { MobileMenuAutoClose } from './mobile-menu-auto-close';

// Header compartilhado pelas duas zonas — UM header, não dois; sem estado
// (mega menu em CSS). Ver ADR 0004, raiz
// (docs/adr/0004-casca-como-componentes-react-em-workspace.md), e ADR 0017 do
// storefront (apps/storefront/adr/0017-mega-menu-css-puro-group-hover-focus-within.md).
export function AppHeader({
  activeZone = 'storefront',
  userLoggedIn = false,
  departments,
  featuredCategories,
}: {
  activeZone?: NavZone;
  userLoggedIn?: boolean;
  /** Árvore completa de departamentos → subcategorias. */
  departments: NavDepartment[];
  /** Atalhos da barra horizontal. O link do Blog é acrescentado no fim. */
  featuredCategories: NavCategory[];
}) {
  const isActive = (zone: NavZone) => activeZone === zone;

  const featuredLink = `text-sm whitespace-nowrap hover:underline aria-[current=page]:underline ${mutedText} ${fgTextHover} aria-[current=page]:text-[#18181b] dark:aria-[current=page]:text-[#fafafa]`;
  const actionButton = `grid h-9 w-9 place-items-center rounded-md ${hoverBg} ${focusRing}`;

  return (
    // `sticky` também vira o bloco de contenção dos painéis `absolute` do menu
    // mobile — ver ADR 0017 do storefront, §5.1.
    <header
      className={`sticky top-0 z-40 border-b font-sans backdrop-blur-[14px] ${border} ${barBg} ${fgText}`}
    >
      <div
        className={`flex flex-wrap items-center gap-4 px-4 py-3 max-[760px]:gap-y-3 ${railWidth}`}
      >
        {/* `group/menu` liga o ícone (`@repo/ui`) ao `[open]` — ver ui-0001, §2. */}
        <details className="group/menu lg:hidden">
          <summary
            aria-label="Abrir menu de categorias"
            className={`grid h-9 w-9 cursor-pointer list-none place-items-center rounded-md [&::-webkit-details-marker]:hidden ${hoverBg} ${focusRing}`}
          >
            <MenuToggleIcon />
          </summary>

          {/* Ancora no `<header>` sticky, não no `<details>` — ver ADR 0017 do storefront, §5.1. */}
          <MobileMenuAutoClose
            aria-label="Todas as categorias"
            className={`absolute inset-x-0 top-full z-50 box-border max-h-[calc(100dvh-100%)] overflow-y-auto border-b px-4 py-5 ${border} ${surfaceBg} ${panelShadow}`}
          >
            <CategoryColumns departments={departments} variant="mobile" />

            <a
              href="/categorias"
              className={`mt-6 inline-block text-sm font-semibold underline ${focusRing}`}
            >
              Ver todas as categorias
            </a>
          </MobileMenuAutoClose>
        </details>

        <Brand />

        <SearchForm className="flex-[1_1_13rem] max-[760px]:order-4 max-[760px]:basis-full" />

        {/*
          `ml-auto` só faz efeito quando a busca quebra para a linha de baixo:
          sem ela, as ações ficariam coladas na marca.
        */}
        <nav aria-label="Conta e carrinho" className="ml-auto flex flex-none items-center gap-1">
          <a
            href="/conta"
            aria-label={userLoggedIn ? 'Minha conta' : 'Entrar'}
            className={`${actionButton} max-[639px]:hidden`}
          >
            <AccountIcon />
          </a>

          {/*
            Sem badge de quantidade: o contador depende de estado do usuário e
            teria que ser buscado no client em toda página. Quando entrar,
            entra como elemento próprio — não transformando o header em algo
            que precisa de dados do usuário para renderizar.
          */}
          <a href="/carrinho" aria-label="Carrinho" className={actionButton}>
            <CartIcon />
          </a>
        </nav>
      </div>

      {/* Segunda linha, só desktop. */}
      <div className={`hidden items-center gap-6 px-4 pb-3 lg:flex ${railWidth}`}>
        <MegaMenu departments={departments} />

        <nav aria-label="Categorias em destaque">
          <NavList
            className="flex items-center gap-5"
            linkClassName={featuredLink}
            items={featuredCategories.map((category) => ({
              key: category.slug,
              href: category.href,
              label: category.name,
            }))}
          >
            {/* Cruza zona (storefront → blog): sempre navegação de página inteira. */}
            <li>
              <a
                href="/blog"
                aria-current={isActive('blog') ? 'page' : undefined}
                className={`${featuredLink} ${focusRing}`}
              >
                Blog
              </a>
            </li>
          </NavList>
        </nav>
      </div>
    </header>
  );
}

// Gatilho `<a>`, abrir/fechar sem JS via `group-focus-within` — ver ADR 0017
// do storefront (apps/storefront/adr/0017-mega-menu-css-puro-group-hover-focus-within.md).
function MegaMenu({ departments }: { departments: NavDepartment[] }) {
  return (
    <div className="group/mega relative">
      <a
        href="/categorias"
        className={`flex items-center gap-1.5 py-1 text-sm font-semibold whitespace-nowrap ${focusRing}`}
      >
        Todas as categorias
        <ChevronDownIcon className="h-3.5 w-3.5 transition-transform duration-150 group-hover/mega:rotate-180 group-focus-within/mega:rotate-180" />
      </a>

      {/*
        O respiro entre gatilho e painel é `pt-3` do wrapper, não `margin`:
        precisa ficar DENTRO da área sensível ao hover, senão o mouse "cai" no
        vão e o menu fecha no meio do caminho.
      */}
      <div className="invisible absolute top-full left-0 z-50 pt-3 opacity-0 transition-[opacity,visibility] delay-100 duration-150 group-hover/mega:visible group-hover/mega:opacity-100 group-focus-within/mega:visible group-focus-within/mega:opacity-100">
        <nav
          aria-label="Todas as categorias"
          className={`box-border max-h-[70vh] w-max max-w-[min(56rem,calc(100vw-3rem))] overflow-y-auto rounded-xl border p-6 ${border} ${surfaceBg} ${panelShadow}`}
        >
          <CategoryColumns departments={departments} variant="mega" />
        </nav>
      </div>
    </div>
  );
}
