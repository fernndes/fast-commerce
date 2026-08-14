import { Component, Prop, h } from '@stencil/core';

@Component({
  tag: 'app-header',
  styleUrl: 'app-header.css',
  shadow: true,
})
export class AppHeader {
  @Prop() activeZone: 'storefront' | 'blog' = 'storefront';
  @Prop() userLoggedIn = false;

  private isActive(zone: 'storefront' | 'blog') {
    return this.activeZone === zone ? 'page' : undefined;
  }

  render() {
    return (
      <header class="shell">
        <div class="bar">
          <a class="brand" href="/" aria-label="Fast Commerce">
            fast<span>commerce</span>
          </a>

          <nav class="nav" aria-label="Seções principais">
            <a href="/produtos" aria-current={this.isActive('storefront')}>
              Produtos
            </a>
            <a href="/categorias">Categorias</a>
            <a href="/blog" aria-current={this.isActive('blog')}>
              Blog
            </a>
          </nav>

          <form class="search" action="/busca" method="get" role="search">
            <label htmlFor="app-header-search">Buscar</label>
            <input id="app-header-search" name="q" type="search" placeholder="Buscar produtos" />
            <button type="submit">Buscar</button>
          </form>

          <nav class="actions" aria-label="Conta e carrinho">
            <a href="/conta">{this.userLoggedIn ? 'Conta' : 'Entrar'}</a>
            <a href="/carrinho">Carrinho</a>
          </nav>
        </div>
      </header>
    );
  }
}
