import Link from 'next/link';

import { CategoryColumns } from '@/components/mega-menu/category-columns';
import { getCategoryTree } from '@/lib/categories';

/**
 * Footer — Server Component, zero JS, em toda página.
 *
 * A regra do header vale aqui igual: o rodapé é renderizado em TODA rota, então
 * qualquer byte de JS embarcado é imposto pago no site inteiro. Tudo aqui sai
 * como `<a href>` no HTML servido.
 *
 * A árvore de categorias é a MESMA do mega menu — `getCategoryTree()` é uma
 * promise memoizada por processo, então repetir a chamada não relê o catálogo.
 * E `<CategoryColumns>` é reaproveitado em vez de duplicar a marcação: um só
 * lugar decide como um link de categoria se parece.
 *
 * O bloco de categorias fica dentro de um `<details>` no mobile (nativo, sem
 * JS): são ~30 links que, abertos, empurrariam o resto do rodapé para longe
 * demais no dedo. No desktop o `<details>` é neutralizado por CSS
 * (`lg:[&>summary]:hidden` + `open` forçado via `lg:[&]:block` no conteúdo) —
 * ver o comentário no próprio bloco.
 */

/** Colunas institucionais. Rotas que ainda não existem estão marcadas. */
const COLUNAS = [
  {
    id: 'institucional',
    titulo: 'Institucional',
    links: [
      // TODO: rotas institucionais ainda não existem.
      { label: 'Sobre a fastcommerce', href: '/institucional/sobre' },
      { label: 'Trabalhe conosco', href: '/institucional/carreiras' },
      { label: 'Nossas lojas', href: '/institucional/lojas' },
      { label: 'Blog do pet', href: '/blog' },
    ],
  },
  {
    id: 'ajuda',
    titulo: 'Ajuda',
    links: [
      // TODO: central de ajuda ainda não existe.
      { label: 'Central de atendimento', href: '/ajuda' },
      { label: 'Prazos e fretes', href: '/ajuda/entrega' },
      { label: 'Trocas e devoluções', href: '/ajuda/trocas' },
      { label: 'Acompanhar pedido', href: '/conta/pedidos' },
      { label: 'Perguntas frequentes', href: '/ajuda/faq' },
    ],
  },
  {
    id: 'conta',
    titulo: 'Minha conta',
    links: [
      // TODO: área logada ainda não existe.
      { label: 'Entrar ou cadastrar', href: '/conta' },
      { label: 'Meus pedidos', href: '/conta/pedidos' },
      { label: 'Meus dados', href: '/conta/dados' },
      { label: 'Carrinho', href: '/carrinho' },
      { label: 'Todos os produtos', href: '/produtos' },
    ],
  },
];

const REDES = [
  { label: 'Instagram', href: 'https://instagram.com' },
  { label: 'Facebook', href: 'https://facebook.com' },
  { label: 'YouTube', href: 'https://youtube.com' },
];

const PAGAMENTOS = ['Visa', 'Mastercard', 'Elo', 'Amex', 'Pix', 'Boleto'];

const linkClasses =
  'text-sm text-zinc-600 hover:text-zinc-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-zinc-400 dark:hover:text-zinc-50';

export async function Footer() {
  const departamentos = await getCategoryTree();
  const ano = new Date().getFullYear();

  return (
    // `mt-auto` fecha o layout de coluna do `<body>`: em página curta o rodapé
    // encosta embaixo em vez de flutuar no meio da tela.
    <footer className="mt-auto border-t border-black/10 dark:border-white/15">
      <div className="page-shell flex flex-col gap-10 py-10">
        {/*
          `<details>` nativo: no mobile abre e fecha sem JS. No desktop o
          `summary` some e o conteúdo volta a ser `block`, então o estado
          fechado do elemento deixa de ter efeito visual — o painel fica sempre
          aberto sem precisar de `open` vindo do servidor.
        */}
        <details className="group border-b border-black/10 pb-6 lg:border-0 lg:pb-0 dark:border-white/15">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-md py-1 text-sm font-semibold text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 lg:hidden dark:text-zinc-50">
            Navegue por categoria
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              className="size-3.5 fill-none stroke-current stroke-[1.5] transition-transform duration-150 group-open:rotate-180"
            >
              <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>

          <nav aria-label="Categorias" className="pt-6 lg:pt-0">
            <h2 className="mb-6 hidden text-sm font-semibold text-zinc-950 lg:block dark:text-zinc-50">
              Navegue por categoria
            </h2>
            <CategoryColumns
              departments={departamentos}
              className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7"
            />
          </nav>
        </details>

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
                  <li key={link.href + link.label}>
                    {/*
                      `prefetch={false}` em todo o rodapé: são dezenas de links
                      no fim de toda página, quase todos de baixa intenção.
                      Prefetchar isso é banda gasta em rota que ninguém abre.
                    */}
                    <Link href={link.href} prefetch={false} className={linkClasses}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="flex flex-col gap-6">
            <div>
              <h2 className="mb-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Atendimento
              </h2>
              <ul className="flex flex-col gap-2">
                <li>
                  <a href="tel:+551140028922" className={linkClasses}>
                    (11) 4002-8922
                  </a>
                </li>
                <li>
                  <a href="mailto:atendimento@fastcommerce.com.br" className={linkClasses}>
                    atendimento@fastcommerce.com.br
                  </a>
                </li>
                <li className="text-sm text-zinc-600 dark:text-zinc-400">
                  Seg a sex, das 8h às 20h
                </li>
              </ul>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Redes sociais
              </h2>
              <ul className="flex flex-wrap gap-x-4 gap-y-2">
                {REDES.map((rede) => (
                  <li key={rede.label}>
                    {/* Externo: `<a>` puro — não há rota do Next para prefetchar. */}
                    <a
                      href={rede.href}
                      target="_blank"
                      rel="noreferrer"
                      className={linkClasses}
                    >
                      {rede.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-black/10 pt-6 dark:border-white/15">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              Formas de pagamento
            </h2>
            <ul className="flex flex-wrap gap-2">
              {PAGAMENTOS.map((bandeira) => (
                <li
                  key={bandeira}
                  className="rounded-md border border-black/10 px-2.5 py-1 text-xs text-zinc-600 dark:border-white/15 dark:text-zinc-400"
                >
                  {bandeira}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between dark:text-zinc-400">
            <p>
              © {ano} fastcommerce · CNPJ 00.000.000/0001-00 · Rua Exemplo, 100 — São Paulo/SP
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {/* TODO: páginas legais ainda não existem. */}
              <li>
                <Link
                  href="/institucional/privacidade"
                  prefetch={false}
                  className={`${linkClasses} text-xs`}
                >
                  Política de privacidade
                </Link>
              </li>
              <li>
                <Link
                  href="/institucional/termos"
                  prefetch={false}
                  className={`${linkClasses} text-xs`}
                >
                  Termos de uso
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
