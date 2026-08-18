import { NavList } from '@repo/ui/nav-list';
import { border, fgText, fgTextHover, focusRing, mutedText, railWidth } from '@repo/ui/tokens';

/*
 * Ano do copyright resolvido UMA vez, no carregamento do módulo — não a cada
 * render.
 *
 * ATENÇÃO — o raciocínio original mudou de forma no RSC, e vale relê-lo. Antes,
 * o risco era divergência entre o HTML do SSR e a re-renderização na hidratação
 * na virada do ano. Como Server Component não há hidratação deste componente, e
 * o risco vira outro, maior: numa página estaticamente gerada, o valor é
 * congelado no BUILD. Um site buildado em dezembro mostra o ano velho em
 * janeiro, e nada o corrige até o próximo deploy.
 *
 * A escolha aqui é deliberada: `CURRENT_YEAR` continua sendo o DEFAULT, porque
 * é o que faz o pacote funcionar sem cerimônia; a zona que se importa com a
 * virada passa `year` explicitamente, ou mantém o footer fora do caminho
 * estático. Trocar por `new Date()` dentro do componente não resolveria o
 * problema real — numa página estática ele roda no build do mesmo jeito.
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

const linkClass = `text-sm leading-[1.45] hover:underline ${mutedText} ${fgTextHover}`;

export function AppFooter({ year = CURRENT_YEAR }: { year?: number }) {
  return (
    <footer className={`mt-auto border-t font-sans ${border} ${fgText}`}>
      <div className={`flex flex-col gap-10 px-4 py-10 ${railWidth}`}>
        <div className="grid grid-cols-4 gap-8 max-[760px]:grid-cols-2 max-[520px]:grid-cols-1">
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="mb-3 text-sm font-bold">{column.title}</h2>
              <NavList
                className="flex flex-col gap-2"
                linkClassName={linkClass}
                items={column.links}
              />
            </nav>
          ))}

          <div>
            <h2 className="mb-3 text-sm font-bold">Atendimento</h2>
            <ul className="flex flex-col gap-2">
              <li>
                <a href="tel:+551140028922" className={`${linkClass} ${focusRing}`}>
                  (11) 4002-8922
                </a>
              </li>
              <li>
                <a
                  href="mailto:atendimento@fastcommerce.com.br"
                  className={`${linkClass} ${focusRing}`}
                >
                  atendimento@fastcommerce.com.br
                </a>
              </li>
              <li className={`text-sm leading-[1.45] ${mutedText}`}>Seg a sex, das 8h às 20h</li>
            </ul>
          </div>
        </div>

        <div
          className={`flex justify-between gap-4 border-t pt-6 text-xs max-[760px]:flex-col ${border} text-[#71717a] dark:text-[#a1a1aa]`}
        >
          <p>
            © {year} fastcommerce · CNPJ 00.000.000/0001-00 · Rua Exemplo, 100 - São Paulo/SP
          </p>
          <nav aria-label="Links legais" className="flex flex-wrap gap-4">
            <a
              href="/institucional/privacidade"
              className={`hover:underline ${fgTextHover} ${focusRing}`}
            >
              Política de privacidade
            </a>
            <a href="/institucional/termos" className={`hover:underline ${fgTextHover} ${focusRing}`}>
              Termos de uso
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
