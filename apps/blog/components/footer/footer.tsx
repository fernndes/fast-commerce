import Link from 'next/link';

/**
 * Footer da zona blog — Server Component, zero JS.
 *
 * Versão enxuta do footer do storefront: sem a árvore de categorias, porque
 * essa árvore vem de `lib/categories.ts`, que lê o catálogo. Arrastar o catálogo
 * para cá só para desenhar um rodapé acoplaria a zona estática ao dado que ela
 * existe para não ter. O que fica é o que é institucional — e o visual bate
 * porque os tokens são os mesmos (`globals.css`).
 *
 * Vale a mesma regra do header: `<a>` cruza zona, `<Link>` fica dentro dela.
 * Ver Blog-0001.
 */

/** Tudo aqui mora no storefront — por isso a coluna inteira é de `<a>`. */
const COLUNAS = [
  {
    id: 'institucional',
    titulo: 'Institucional',
    links: [
      { label: 'Sobre a fastcommerce', href: '/institucional/sobre' },
      { label: 'Trabalhe conosco', href: '/institucional/carreiras' },
      { label: 'Nossas lojas', href: '/institucional/lojas' },
    ],
  },
  {
    id: 'ajuda',
    titulo: 'Ajuda',
    links: [
      { label: 'Central de atendimento', href: '/ajuda' },
      { label: 'Prazos e fretes', href: '/ajuda/entrega' },
      { label: 'Trocas e devoluções', href: '/ajuda/trocas' },
    ],
  },
  {
    id: 'loja',
    titulo: 'Loja',
    links: [
      { label: 'Todos os produtos', href: '/produtos' },
      { label: 'Categorias', href: '/categorias' },
      { label: 'Carrinho', href: '/carrinho' },
    ],
  },
];

const linkClasses =
  'text-sm text-zinc-600 hover:text-zinc-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-zinc-400 dark:hover:text-zinc-50';

export function Footer() {
  const ano = new Date().getFullYear();

  return (
    // `mt-auto` fecha o layout de coluna do `<body>` — mesma mecânica do storefront.
    <footer className="mt-auto border-t border-black/10 dark:border-white/15">
      <div className="page-shell flex flex-col gap-10 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {COLUNAS.map((coluna) => (
            <nav key={coluna.id} aria-labelledby={`rodape-${coluna.id}`}>
              <h2
                id={`rodape-${coluna.id}`}
                className="mb-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50"
              >
                {coluna.titulo}
              </h2>
              <ul className="flex flex-col gap-2">
                {coluna.links.map((link) => (
                  <li key={link.href}>
                    {/* Cruza zona — `<a>`. */}
                    <a href={link.href} className={linkClasses}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <nav aria-labelledby="rodape-blog">
            <h2
              id="rodape-blog"
              className="mb-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50"
            >
              Blog
            </h2>
            <ul className="flex flex-col gap-2">
              <li>
                {/* Dentro da zona — `<Link>`. Vira `/blog` pelo `basePath`. */}
                <Link href="/" className={linkClasses}>
                  Todos os posts
                </Link>
              </li>
              <li>
                {/*
                  O canal de crawler que substitui a paginação. Fica visível de
                  propósito: é a única rota pela qual um leitor sem JS alcança o
                  post nº 5.000. Ver Blog-0005.
                */}
                <a href="/blog/sitemap.xml" className={linkClasses}>
                  Índice completo (sitemap)
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-3 border-t border-black/10 pt-6 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between dark:border-white/15 dark:text-zinc-400">
          <p>© {ano} fastcommerce · CNPJ 00.000.000/0001-00 · Rua Exemplo, 100 — São Paulo/SP</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            <li>
              <a href="/institucional/privacidade" className={`${linkClasses} text-xs`}>
                Política de privacidade
              </a>
            </li>
            <li>
              <a href="/institucional/termos" className={`${linkClasses} text-xs`}>
                Termos de uso
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
