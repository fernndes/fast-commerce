import { Brand } from '@repo/ui/brand';
import { AccountIcon, CartIcon, ChevronDownIcon, MenuToggleIcon } from '@repo/ui/icon';
import { NavList } from '@repo/ui/nav-list';
import { SearchForm } from '@repo/ui/search-form';
import {
  barBg,
  border,
  currentBg,
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

/**
 * Header compartilhado pelas duas zonas. Ele tem DOIS modos, decididos pelos
 * dados que a zona passa — não por um flag:
 *
 * - Com `departments`, monta a casca completa do storefront: segunda linha com
 *   mega menu (desktop), barra de categorias em destaque e menu de disclosure
 *   no mobile.
 * - Sem `departments` (o blog), fica na barra única com o nav simples.
 *
 * Por que os dados vêm por prop: a árvore de categorias é do catálogo do
 * storefront (`lib/categories.ts`), e o pacote não pode buscá-la — ele roda
 * igual nas duas zonas e não conhece a origem dos dados. A zona busca no
 * server e passa pronto. Como isto é um Server Component (ver ADR 0004), os
 * dados são consumidos NO SERVIDOR e nunca são serializados para o cliente —
 * é por isso que a zona pode passar a árvore inteira, com `count` e tudo, sem
 * custo de payload.
 *
 * Abrir/fechar o mega menu é CSS (`:hover` / `:focus-within`, aqui como
 * `group-hover:` / `group-focus-within:`), não estado: o painel existe no HTML
 * servido em toda página, e é justamente por isso que os links de categoria são
 * rastreáveis. O menu mobile é `<details>` nativo.
 */
export function AppHeader({
  activeZone = 'storefront',
  userLoggedIn = false,
  departments = [],
  featuredCategories = [],
}: {
  activeZone?: NavZone;
  userLoggedIn?: boolean;
  /** Árvore completa de departamentos → subcategorias. Vazio = modo simples. */
  departments?: NavDepartment[];
  /** Atalhos da barra horizontal. O link do Blog é acrescentado no fim. */
  featuredCategories?: NavCategory[];
}) {
  const hasMenu = departments.length > 0;
  const hasFeatured = featuredCategories.length > 0;
  const isActive = (zone: NavZone) => activeZone === zone;

  const simpleNavLink = `rounded-md px-[0.6rem] py-[0.45rem] text-sm leading-[1.2] whitespace-nowrap ${mutedText} ${fgTextHover} ${hoverBg} ${currentBg} aria-[current=page]:text-[#18181b] dark:aria-[current=page]:text-[#fafafa]`;
  const featuredLink = `text-sm whitespace-nowrap hover:underline aria-[current=page]:underline ${mutedText} ${fgTextHover} aria-[current=page]:text-[#18181b] dark:aria-[current=page]:text-[#fafafa]`;
  const actionButton = `grid h-9 w-9 place-items-center rounded-md ${hoverBg} ${focusRing}`;

  return (
    /*
     * `sticky` também resolve o que o wrapper interno fazia com `relative` no
     * desenho antigo: qualquer `position` diferente de `static` torna o bloco
     * de contenção dos painéis `absolute` do menu mobile — eles ancoram no
     * header inteiro, ocupando a largura toda, não no `<details>`. Empilhar
     * `relative` junto seria um segundo `position` na mesma classe, com a
     * ordem do CSS gerado decidindo qual vence.
     */
    <header
      className={`sticky top-0 z-40 border-b font-sans backdrop-blur-[14px] ${border} ${barBg} ${fgText}`}
    >
      <div
        className={`flex flex-wrap items-center gap-4 px-4 py-3 max-[760px]:gap-y-3 ${railWidth}`}
      >
        {hasMenu && (
          /*
           * `group/menu` é o que permite ao ícone (em `@repo/ui`) alternar
           * hambúrguer/X a partir de `[open]` sem JS — `group-open/menu:*`.
           */
          <details className="group/menu lg:hidden">
            <summary
              aria-label="Abrir menu de categorias"
              className={`grid h-9 w-9 cursor-pointer list-none place-items-center rounded-md [&::-webkit-details-marker]:hidden ${hoverBg} ${focusRing}`}
            >
              <MenuToggleIcon />
            </summary>

            {/* Ancora no `<header>`, não no `<details>`: ocupa a largura toda. */}
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
        )}

        <Brand />

        {/* Modo simples (blog): sem árvore de categorias, o nav é a navegação. */}
        {!hasMenu && (
          <nav
            aria-label="Seções principais"
            className="flex-[0_1_auto] max-[760px]:order-3 max-[760px]:basis-full max-[760px]:overflow-x-auto"
          >
            <NavList
              className="flex items-center gap-1"
              linkClassName={simpleNavLink}
              items={[
                { href: '/produtos', label: 'Produtos', current: isActive('storefront') },
                { href: '/categorias', label: 'Categorias' },
                { href: '/blog', label: 'Blog', current: isActive('blog') },
              ]}
            />
          </nav>
        )}

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
      {(hasMenu || hasFeatured) && (
        <div className={`hidden items-center gap-6 px-4 pb-3 lg:flex ${railWidth}`}>
          {hasMenu && <MegaMenu departments={departments} />}
          {hasFeatured && (
            <nav aria-label="Categorias em destaque">
              <NavList
                className="flex items-center gap-5"
                linkClassName={featuredLink}
                items={featuredCategories.map((categoria) => ({
                  key: categoria.slug,
                  href: categoria.href,
                  label: categoria.name,
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
          )}
        </div>
      )}
    </header>
  );
}

/*
 * O gatilho é um `<a>`, não um `<button>`: ele tem destino próprio
 * (`/categorias`) e funciona antes de qualquer JS. Em touch, onde não há
 * hover, tocar nele NAVEGA para a listagem completa — degradação correta, não
 * um botão morto. Por isso também não há `aria-expanded`: não existe estado
 * que o HTML servido possa declarar com honestidade.
 *
 * Abrir/fechar sem JS. `group-focus-within` é o caminho do teclado: o painel
 * começa `invisible`, o que TIRA os links da ordem de tabulação; focar o gatilho
 * o torna visível e os links passam a ser alcançáveis por Tab. Sair do último
 * fecha. Por isso `visibility` — `opacity-0` sozinho deixaria links invisíveis
 * porém focáveis.
 *
 * O `group-hover` do Tailwind v4 já vive dentro de `@media (hover: hover)`, que
 * é exatamente a guarda que o CSS antigo escrevia à mão: touch não dispara
 * abertura por acidente, e lá tocar o gatilho navega para `/categorias`.
 */
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
