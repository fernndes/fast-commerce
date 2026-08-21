import Image from 'next/image';
import Link from 'next/link';

import { Carousel, CarouselItem } from '@/components/carousel/carousel';
import { CarouselAutoplay } from '@/components/carousel/carousel-autoplay';
import type { Banner } from '@/lib/banners';

const HERO_ID = 'hero-carousel';

type HeroProps = {
  banners: Banner[];
  /** Rotação automática. Desligue se o hero for um banner único. */
  autoRotate?: boolean;
};

// Hero — normalmente o elemento de LCP da home. Ver ADR 0013
// (adr/0013-hero-preload-slide-zero-lazy-demais-ilha-irma.md).
export function Hero({ banners, autoRotate = true }: HeroProps) {
  if (banners.length === 0) return null;

  return (
    <section aria-roledescription="carrossel" aria-label="Destaques da loja">
      <Carousel
        id={HERO_ID}
        label="Banners em destaque"
        controls={
          autoRotate ? (
            <CarouselAutoplay
              targetId={HERO_ID}
              count={banners.length}
              slideLabels={banners.map((b, i) => `Ir para o banner ${i + 1}: ${b.title}`)}
            />
          ) : null
        }
      >
        {banners.map((banner, index) => (
          <HeroSlide key={banner.id} banner={banner} index={index} total={banners.length} />
        ))}
      </Carousel>
    </section>
  );
}

function HeroSlide({ banner, index, total }: { banner: Banner; index: number; total: number }) {
  const isFirst = index === 0;

  return (
    <CarouselItem className="w-full">
      <Link
        href={banner.href}
        aria-label={`${banner.title} — ${banner.cta}`}
        className="group relative block aspect-[4/3] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white sm:aspect-[2/1] lg:aspect-[12/5]"
      >
        <Image
          src={banner.image}
          alt={banner.alt}
          fill
          sizes="100vw"
          className="bg-zinc-200 object-cover dark:bg-zinc-800"
          {...(isFirst ? { preload: true, fetchPriority: "high" } : { loading: 'lazy' as const })}
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

        <div className="absolute inset-y-0 left-0 flex max-w-xl flex-col justify-center gap-2 p-6 pb-16 text-white sm:gap-4 sm:px-10 lg:max-w-2xl">
          <span className="text-xs font-medium uppercase tracking-widest text-white/70">
            {index + 1} / {total}
          </span>
          <h2 className="text-2xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl lg:text-5xl">
            {banner.title}
          </h2>
          <p className="hidden text-sm text-white/85 text-pretty sm:block sm:text-lg">
            {banner.subtitle}
          </p>
          <span className="mt-1 w-fit rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-colors group-hover:bg-white/85 sm:mt-2">
            {banner.cta}
          </span>
        </div>
      </Link>
    </CarouselItem>
  );
}
