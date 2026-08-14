/*
 * Casca mínima usada quando o header/footer compartilhado falha ao renderizar.
 * Ver `shell-boundary.tsx`.
 *
 * Regra: só o que garante que a página continue navegável — marca, link para a
 * home e os links legais. Sem busca, sem conta, sem carrinho. Deliberadamente
 * NÃO tenta imitar o componente real: ele pode ter mudado, e uma cópia velha
 * seria uma segunda fonte de verdade a manter.
 *
 * Os `href` são `<a>` com caminho absoluto do DOMÍNIO, não `<Link>`: o
 * `basePath: '/blog'` não deve ser aplicado a `/` e `/produtos`, que pertencem à
 * zona storefront. Travessia de zona é sempre navegação de página inteira —
 * mesma convenção do resto do blog (ver Blog-0001).
 */

export function FallbackHeader() {
  return (
    <header className="border-b border-black/10 dark:border-white/15">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <a href="/" className="text-lg font-semibold" aria-label="Fast Commerce">
          fast<span className="font-normal">commerce</span>
        </a>
        <nav aria-label="Seções principais" className="flex gap-4 text-sm">
          <a href="/produtos">Produtos</a>
          <a href="/categorias">Categorias</a>
          <a href="/blog" aria-current="page">
            Blog
          </a>
        </nav>
      </div>
    </header>
  );
}

export function FallbackFooter() {
  return (
    <footer className="mt-auto border-t border-black/10 dark:border-white/15">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-6 text-sm">
        <p>fastcommerce · CNPJ 00.000.000/0001-00</p>
        <nav aria-label="Links legais" className="flex gap-4">
          <a href="/institucional/privacidade">Política de privacidade</a>
          <a href="/institucional/termos">Termos de uso</a>
        </nav>
      </div>
    </footer>
  );
}
