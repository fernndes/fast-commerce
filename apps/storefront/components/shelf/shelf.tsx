import Link from 'next/link';

import { CarouselArrows } from '@/components/carousel/carousel-arrows';
import { Carousel, CarouselItem } from '@/components/carousel/carousel';
import { ProductCard } from '@/components/shelf/product-card';
import type { Product } from '@/lib/catalog';

type ShelfProps = {
  id: string;
  title: string;
  products: Product[];
  /**
   * Destino do "ver tudo". A régua mostra um recorte; sem esta saída, o que
   * ficou de fora do corte fica inalcançável a partir da home.
   */
  href?: string;
};

/**
 * Prateleira: mesmo primitivo do hero, outra configuração de largura de slide.
 * Os cards são Server Components; o arrastar/rolar é CSS nativo. A única
 * parcela de JS são as setas — uma casca fina, opcional, que some sem
 * hidratação sem quebrar nada.
 */
export function Shelf({ id, title, products, href }: ShelfProps) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-4">
      <div className="page-px flex items-center justify-between gap-4">
        <h2
          id={`${id}-title`}
          className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
        >
          {title}
        </h2>
        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          {href && (
            <Link
              href={href}
              // Uma home com 14 prateleiras tem 14 destes: com o prefetch
              // padrão, seriam 14 requests disparados enquanto o usuário rola.
              prefetch={false}
              className="text-sm whitespace-nowrap text-zinc-600 hover:text-zinc-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Ver tudo
            </Link>
          )}
          <CarouselArrows targetId={id} label="produtos" />
        </div>
      </div>

      <Carousel
        id={id}
        label={title}
        scrollerClassName="page-px gap-4 scroll-px-4 sm:gap-6 sm:scroll-px-6"
      >
        {products.map((product) => (
          // `key` pelo slug, não pelo `id`: o `big.json` tem 59 ids repetidos
          // em 10.000 produtos, e só o slug é único.
          <CarouselItem key={product.slug} className="w-[60%] sm:w-[38%] lg:w-[23%]">
            <ProductCard product={product} />
          </CarouselItem>
        ))}
      </Carousel>
    </section>
  );
}
