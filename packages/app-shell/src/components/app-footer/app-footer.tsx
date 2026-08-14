import { Component, Prop, h } from '@stencil/core';

/*
 * Ano do copyright resolvido UMA vez, no carregamento do módulo — não a cada
 * `render()`.
 *
 * Chamar `new Date()` dentro do `render()` tornaria a saída do SSR
 * não-determinística: o mesmo HTML gerado no servidor e re-renderizado na
 * hidratação poderia divergir na virada do ano, e um HTML que muda sozinho não
 * é cacheável com honestidade. Como constante de módulo, o valor é estável
 * dentro de um mesmo processo/bundle.
 *
 * Quem quiser fixá-lo de vez (ex. em página com cache longo) passa `year`
 * explicitamente na tag.
 */
const CURRENT_YEAR = new Date().getFullYear();

const columns = [
  {
    title: 'Institucional',
    links: [
      { label: 'Sobre a fastcommerce', href: '/institucional/sobre' },
      { label: 'Trabalhe conosco', href: '/institucional/carreiras' },
      { label: 'Nossas lojas', href: '/institucional/lojas' },
      { label: 'Blog do pet', href: '/blog' },
    ],
  },
  {
    title: 'Ajuda',
    links: [
      { label: 'Central de atendimento', href: '/ajuda' },
      { label: 'Prazos e fretes', href: '/ajuda/entrega' },
      { label: 'Trocas e devoluções', href: '/ajuda/trocas' },
      { label: 'Acompanhar pedido', href: '/conta/pedidos' },
    ],
  },
  {
    title: 'Loja',
    links: [
      { label: 'Todos os produtos', href: '/produtos' },
      { label: 'Categorias', href: '/categorias' },
      { label: 'Carrinho', href: '/carrinho' },
    ],
  },
];

@Component({
  tag: 'app-footer',
  styleUrl: 'app-footer.css',
  shadow: true,
})
export class AppFooter {
  /** Ano exibido no aviso de copyright. Ver `CURRENT_YEAR`. */
  @Prop() year: number = CURRENT_YEAR;

  render() {
    const { year } = this;

    return (
      <footer class="shell">
        <div class="content">
          <div class="grid">
            {columns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2>{column.title}</h2>
                <ul>
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <a href={link.href}>{link.label}</a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            <div>
              <h2>Atendimento</h2>
              <ul>
                <li>
                  <a href="tel:+551140028922">(11) 4002-8922</a>
                </li>
                <li>
                  <a href="mailto:atendimento@fastcommerce.com.br">
                    atendimento@fastcommerce.com.br
                  </a>
                </li>
                <li>Seg a sex, das 8h às 20h</li>
              </ul>
            </div>
          </div>

          <div class="legal">
            <p>
              © {year} fastcommerce · CNPJ 00.000.000/0001-00 · Rua Exemplo, 100 - São
              Paulo/SP
            </p>
            <nav aria-label="Links legais">
              <a href="/institucional/privacidade">Política de privacidade</a>
              <a href="/institucional/termos">Termos de uso</a>
            </nav>
          </div>
        </div>
      </footer>
    );
  }
}
