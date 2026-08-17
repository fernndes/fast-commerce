import { Component, Prop, h } from '@stencil/core';

import type { ShellCategory, ShellDepartment } from './types';

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
 * server e passa pronto. Como o SSR aqui é execução real de JS (hydrate app do
 * Stencil, ver ADR 0003), array de objeto atravessa como valor, sem virar
 * string de atributo.
 *
 * Abrir/fechar o mega menu é CSS (`:hover` / `:focus-within`), não estado: o
 * painel existe no HTML servido em toda página, e é justamente por isso que os
 * links de categoria são rastreáveis. O menu mobile é `<details>` nativo.
 */
@Component({
  tag: 'app-header',
  styleUrl: 'app-header.css',
  shadow: true,
})
export class AppHeader {
  @Prop() activeZone: 'storefront' | 'blog' = 'storefront';
  @Prop() userLoggedIn = false;

  /** Árvore completa de departamentos → subcategorias. Vazio = modo simples. */
  @Prop() departments: ShellDepartment[] = [];

  /** Atalhos da barra horizontal. O link do Blog é acrescentado no fim. */
  @Prop() featuredCategories: ShellCategory[] = [];

  private mobileMenu?: HTMLDetailsElement;

  private isActive(zone: 'storefront' | 'blog') {
    return this.activeZone === zone ? 'page' : undefined;
  }

  /*
   * Toda navegação daqui é `<a href>` — hard navigation, inclusive entre zonas
   * (ver Blog-0001). O documento novo já nasceria com o `<details>` fechado,
   * então isto não conserta um bug: só evita que o painel fique aberto por cima
   * da página durante o tempo de carga.
   */
  private closeMobileMenu = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (this.mobileMenu && target?.closest('a')) {
      this.mobileMenu.open = false;
    }
  };

  /**
   * Colunas de departamento com suas subcategorias — o CONTEÚDO da navegação
   * por categorias, compartilhado pelas duas cascas (mega menu de desktop e
   * disclosure de mobile). As cascas mudam só onde e quando ele aparece.
   */
  private renderColumns(variant: 'mega' | 'mobile') {
    return (
      <ul class={`columns columns-${variant}`}>
        {this.departments.map((dept) => (
          <li key={dept.slug}>
            <a class="column-title" href={dept.href}>
              {dept.name}
            </a>

            <ul class="column-links">
              {dept.children.map((child) => (
                <li key={child.slug}>
                  <a href={child.href}>{child.name}</a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    );
  }

  private renderMobileMenu() {
    return (
      <details class="menu-mobile" ref={(el) => (this.mobileMenu = el as HTMLDetailsElement)}>
        <summary aria-label="Abrir menu de categorias">
          <svg viewBox="0 0 16 16" aria-hidden="true" class="icon">
            <g class="icon-closed">
              <path d="M2 4h12M2 8h12M2 12h12" stroke-linecap="round" />
            </g>
            <g class="icon-open">
              <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
            </g>
          </svg>
        </summary>

        {/* Ancora no `.shell`, não no `<details>`: ocupa a largura toda. */}
        <nav class="menu-mobile-panel" aria-label="Todas as categorias" onClick={this.closeMobileMenu}>
          {this.renderColumns('mobile')}

          <a class="menu-mobile-all" href="/categorias">
            Ver todas as categorias
          </a>
        </nav>
      </details>
    );
  }

  /*
   * O gatilho é um `<a>`, não um `<button>`: ele tem destino próprio
   * (`/categorias`) e funciona antes de qualquer JS. Em touch, onde não há
   * hover, tocar nele NAVEGA para a listagem completa — degradação correta, não
   * um botão morto. Por isso também não há `aria-expanded`: não existe estado
   * que o HTML servido possa declarar com honestidade.
   */
  private renderMegaMenu() {
    return (
      <div class="mega">
        <a class="mega-trigger" href="/categorias">
          Todas as categorias
          <svg viewBox="0 0 16 16" aria-hidden="true" class="mega-chevron">
            <path d="M4 6l4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </a>

        {/*
          O respiro entre gatilho e painel é `padding` do wrapper, não `margin`:
          precisa ficar DENTRO da área sensível ao hover, senão o mouse "cai" no
          vão e o menu fecha no meio do caminho.
        */}
        <div class="mega-panel">
          <nav aria-label="Todas as categorias">{this.renderColumns('mega')}</nav>
        </div>
      </div>
    );
  }

  private renderFeatured() {
    return (
      <nav class="featured" aria-label="Categorias em destaque">
        <ul>
          {this.featuredCategories.map((categoria) => (
            <li key={categoria.slug}>
              <a href={categoria.href}>{categoria.name}</a>
            </li>
          ))}

          {/* Cruza zona (storefront → blog): sempre navegação de página inteira. */}
          <li>
            <a href="/blog" aria-current={this.isActive('blog')}>
              Blog
            </a>
          </li>
        </ul>
      </nav>
    );
  }

  render() {
    const hasMenu = this.departments.length > 0;
    const hasFeatured = this.featuredCategories.length > 0;

    return (
      <header class="shell">
        <div class="bar">
          {hasMenu && this.renderMobileMenu()}

          <a class="brand" href="/" aria-label="Fast Commerce">
            fast<span>commerce</span>
          </a>

          {/* Modo simples (blog): sem árvore de categorias, o nav é a navegação. */}
          {!hasMenu && (
            <nav class="nav" aria-label="Seções principais">
              <a href="/produtos" aria-current={this.isActive('storefront')}>
                Produtos
              </a>
              <a href="/categorias">Categorias</a>
              <a href="/blog" aria-current={this.isActive('blog')}>
                Blog
              </a>
            </nav>
          )}

          <form class="search" action="/busca" method="get" role="search">
            <label htmlFor="app-header-search">Buscar</label>
            <input id="app-header-search" name="q" type="search" placeholder="Buscar produtos" />
            <button type="submit">Buscar</button>
          </form>

          <nav class="actions" aria-label="Conta e carrinho">
            <a
              class="action action-account"
              href="/conta"
              aria-label={this.userLoggedIn ? 'Minha conta' : 'Entrar'}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true" class="icon">
                <circle cx="8" cy="5.5" r="2.5" />
                <path d="M3 14c0-2.5 2.2-4 5-4s5 1.5 5 4" stroke-linecap="round" />
              </svg>
            </a>

            {/*
              Sem badge de quantidade: o contador depende de estado do usuário e
              teria que ser buscado no client em toda página. Quando entrar,
              entra como elemento próprio — não transformando o header em algo
              que precisa de dados do usuário para renderizar.
            */}
            <a class="action" href="/carrinho" aria-label="Carrinho">
              <svg viewBox="0 0 16 16" aria-hidden="true" class="icon">
                <path
                  d="M2 3h1.6l1.6 7.5h7L14 5H4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <circle cx="6" cy="13" r="1" />
                <circle cx="11.5" cy="13" r="1" />
              </svg>
            </a>
          </nav>
        </div>

        {/* Segunda linha, só desktop. */}
        {(hasMenu || hasFeatured) && (
          <div class="rail">
            {hasMenu && this.renderMegaMenu()}
            {hasFeatured && this.renderFeatured()}
          </div>
        )}
      </header>
    );
  }
}
