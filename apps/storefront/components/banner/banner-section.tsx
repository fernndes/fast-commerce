import Link from 'next/link';

import { BannerCard } from '@/components/banner/banner-card';
import type { PromoBanner } from '@/lib/banners';

// Colunas do desktop + `sizes` das imagens: a MESMA decisão em duas
// linguagens, por isso classes literais — ver ADR 0018
// (adr/0018-tailwind-sem-css-in-js-de-runtime.md), §4.1.
const COLUMNS = {
  1: { grid: 'grid-cols-1', sizes: '100vw' },
  2: { grid: 'grid-cols-1 sm:grid-cols-2', sizes: '(min-width: 640px) 50vw, 100vw' },
  3: { grid: 'grid-cols-1 sm:grid-cols-3', sizes: '(min-width: 640px) 33vw, 100vw' },
  4: {
    grid: 'grid-cols-2 lg:grid-cols-4',
    sizes: '(min-width: 1024px) 25vw, 50vw',
  },
} as const;

type BannerSectionProps = {
  id: string;
  banners: PromoBanner[];
  columns?: keyof typeof COLUMNS;
  /** Título visível. Sem ele a seção é só a faixa — comum em banner único. */
  title?: string;
  /** "Ver tudo" ao lado do título. Só aparece se houver título. */
  href?: string;
};

// Bloco editorial de banners: grade estática, sem rotação. Seção sem título
// não ganha `aria-label` artificial — não é um marco de navegação.
export function BannerSection({ id, banners, columns = 3, title, href }: BannerSectionProps) {
  if (banners.length === 0) return null;

  const { grid, sizes } = COLUMNS[columns];

  return (
    <section
      aria-labelledby={title ? `${id}-title` : undefined}
      className="page-px flex flex-col gap-4"
    >
      {title && (
        <div className="flex items-center justify-between gap-4">
          <h2
            id={`${id}-title`}
            className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
          >
            {title}
          </h2>
          {href && (
            <Link
              href={href}
              prefetch={false}
              className="shrink-0 text-sm text-zinc-600 hover:text-zinc-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Ver tudo
            </Link>
          )}
        </div>
      )}

      <ul className={`grid gap-4 sm:gap-6 ${grid}`}>
        {banners.map((banner) => (
          <li key={banner.id}>
            <BannerCard banner={banner} sizes={sizes} />
          </li>
        ))}
      </ul>
    </section>
  );
}
