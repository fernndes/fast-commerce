import Link from 'next/link';

/**
 * Header da zona blog — Server Component, zero JS, em toda página.
 *
 * A REGRA DE OURO das Multi-Zones vive neste arquivo, e ela é visual:
 *
 *   `<a href>`   atravessa zona (blog -> storefront). Hard navigation: documento
 *                novo, hidratação nova. É o que tem que acontecer.
 *   `<Link>`     fica DENTRO da zona. Soft navigation, com prefetch.
 *
 * Usar `<Link>` para cruzar a fronteira é o bug silencioso da arquitetura: o
 * Next tenta prefetchar e fazer soft-nav para uma rota que este projeto não
 * conhece, e a navegação falha sem erro visível. Ver Blog-0001.
 *
 * Detalhe que engana: com `basePath: '/blog'`, `<Link href="/">` NÃO aponta para
 * a home do storefront — vira `/blog`, a listagem. Para chegar à home de verdade
 * é preciso `<a href="/">`, que não recebe o prefixo. Os dois convivem abaixo.
 */

/** Seções que moram no storefront. Todas cruzam zona, todas são `<a>`. */
const STOREFRONT_LINKS = [
  { label: 'Produtos', href: '/produtos' },
  { label: 'Categorias', href: '/categorias' },
];

const linkClasses =
  'rounded-md px-2 py-1 text-sm text-zinc-600 hover:text-zinc-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-zinc-400 dark:hover:text-zinc-50';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[var(--background)]/90 backdrop-blur dark:border-white/15">
      <div className="page-shell flex items-center gap-3 py-3 sm:gap-5">
        {/* Cruza zona: `<a>`, não `<Link>`. A logo leva à home do storefront. */}
        <a
          href="/"
          className="shrink-0 text-base font-bold tracking-tight text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-zinc-50"
        >
          fast<span className="font-normal text-zinc-500">commerce</span>
        </a>

        <nav aria-label="Seções" className="flex flex-1 items-center gap-1">
          {/* Dentro da zona: `<Link>`. `href="/"` vira `/blog` pelo `basePath`. */}
          <Link
            href="/"
            className="rounded-md px-2 py-1 text-sm font-semibold text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-zinc-50"
          >
            Blog
          </Link>

          {STOREFRONT_LINKS.map((link) => (
            <a key={link.href} href={link.href} className={`${linkClasses} hidden sm:block`}>
              {link.label}
            </a>
          ))}
        </nav>

        {/* Também cruza zona. */}
        <a href="/carrinho" className={`${linkClasses} shrink-0`}>
          Carrinho
        </a>
      </div>
    </header>
  );
}
