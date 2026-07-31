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

/**
 * Hero — normalmente o elemento de LCP da home.
 *
 * Server Component puro: imagem + texto, zero JS no caminho crítico. Só o
 * primeiro slide é pré-carregado; os demais ficam lazy, porque o usuário ainda
 * não os viu. Carregar os N banners de uma vez é o erro de LCP clássico aqui.
 *
 * A rotação é uma ilha client irmã (`CarouselAutoplay`) que acha o scroller por
 * id — os slides nunca atravessam a fronteira client, então a primeira imagem
 * está no HTML servido e não espera hidratação para aparecer.
 */
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
        // A arte é panorâmica (~12:5). Deixar essa proporção valer no celular
        // espreme o hero em ~160px de altura e a copy vaza para fora da imagem.
        // Então quem manda na altura é o container, não o arquivo: no mobile a
        // caixa é mais alta e o `object-cover` corta as laterais; a partir de
        // `lg` a proporção intrínseca volta e nada é cortado.
        className="group relative block aspect-[4/3] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white sm:aspect-[2/1] lg:aspect-[12/5]"
      >
        <Image
          src={banner.image}
          alt={banner.alt}
          // `fill` + proporção fixa no pai: o espaço já está reservado antes do
          // byte chegar, então continua zero CLS mesmo sem width/height aqui.
          fill
          sizes="100vw"
          className="bg-zinc-200 object-cover dark:bg-zinc-800"
          // A regra do hero, em uma linha: só o slide 0 é candidato a LCP.
          // `preload` insere o <link rel="preload"> no <head> e desliga o lazy;
          // combinado ao preconnect da CDN no layout, o cano já está aberto.
          // (Em Next 16 `priority` foi depreciado em favor de `preload`, e
          // `preload` + `loading="lazy"` no mesmo Image agora lança erro.)
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
