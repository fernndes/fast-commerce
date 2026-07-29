import { CarouselArrows } from '@/components/carousel/carousel-arrows';
import { Carousel, CarouselItem } from '@/components/carousel/carousel';
import { ProductCard } from '@/components/shelf/product-card';
import type { Product } from '@/lib/products';

type ShelfProps = {
  id: string;
  title: string;
  products: Product[];
};

/**
 * Prateleira: mesmo primitivo do hero, outra configuração de largura de slide.
 * Os cards são Server Components; o arrastar/rolar é CSS nativo. A única
 * parcela de JS são as setas — uma casca fina, opcional, que some sem
 * hidratação sem quebrar nada.
 */
export function Shelf({ id, title, products }: ShelfProps) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6">
        <h2
          id={`${id}-title`}
          className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
        >
          {title}
        </h2>
        <CarouselArrows targetId={id} label="produtos" />
      </div>

      <Carousel
        id={id}
        label={title}
        scrollerClassName="gap-4 px-4 scroll-px-4 sm:gap-6 sm:px-6 sm:scroll-px-6"
      >
        {products.map((product) => (
          <CarouselItem key={product.id} className="w-[60%] sm:w-[38%] lg:w-[23%]">
            <ProductCard product={product} />
          </CarouselItem>
        ))}
      </Carousel>
    </section>
  );
}
