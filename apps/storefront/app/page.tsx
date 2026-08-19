import { BannerSection } from '@/components/banner/banner-section';
import { CategoryTiles } from '@/components/category-tiles/category-tiles';
import { Hero } from '@/components/hero/hero';
import { Highlights } from '@/components/highlights/highlights';
import { Shelf } from '@/components/shelf/shelf';
import { getHeroBanners, getPromoBanners } from '@/lib/banners';
import { getHomeShelf } from '@/lib/home';

export const revalidate = 300;

// Home — só ARRANJO (prateleiras em `lib/home.ts`). Lazy abaixo do hero,
// `prefetch={false}` nos banners. Ver ADR 0010 e ADR 0011.
export default async function Home() {
  return (
    // `page-width` e não `page-shell`: a calha é aplicada bloco a bloco, porque
    // os carrosséis precisam sangrar até a borda do trilho para rolar.
    <main className="page-width flex flex-1 flex-col gap-12 pb-16">
      <h1 className="sr-only">Fast Commerce — tudo para o seu supermercado</h1>

      <Hero banners={getHeroBanners()} />

      <CategoryTiles title="Navegue por categoria" banners={getPromoBanners('atalhos')} />

      <Shelf {...(await getHomeShelf('mais-vendidos'))} />
      <Shelf {...(await getHomeShelf('ofertas'))} />

      <BannerSection
        id="ofertas-por-categoria"
        title="Ofertas por categoria"
        banners={getPromoBanners('ofertas-por-categoria')}
        columns={3}
      />

      <Shelf {...(await getHomeShelf('alimentacao'))} />
      <Shelf {...(await getHomeShelf('farmacia'))} />

      {/* Faixa larga, banner único: o respiro visual do meio da página. */}
      <BannerSection
        id="semana-de-ofertas"
        banners={getPromoBanners('semana-de-ofertas')}
        columns={1}
      />

      <Shelf {...(await getHomeShelf('lancamentos'))} />
      <Shelf {...(await getHomeShelf('higiene'))} />

      <BannerSection
        id="marcas-parceiras"
        title="Marcas e campanhas"
        href="/produtos?minPrice=15000&sort=price-desc"
        banners={getPromoBanners('marcas-parceiras')}
        columns={2}
      />

      <Shelf {...(await getHomeShelf('passeio'))} />
      <Shelf {...(await getHomeShelf('casa'))} />

      <BannerSection
        id="colecoes"
        title="Coleções para cada momento"
        banners={getPromoBanners('colecoes')}
        columns={4}
      />

      <Shelf {...(await getHomeShelf('ate-50'))} />
      <Shelf {...(await getHomeShelf('brincar'))} />

      <BannerSection id="clube" banners={getPromoBanners('clube')} columns={1} />

      <Shelf {...(await getHomeShelf('premium'))} />
      <Shelf {...(await getHomeShelf('frete-gratis'))} />

      <BannerSection
        id="campanhas"
        title="Aproveite também"
        banners={getPromoBanners('campanhas')}
        columns={3}
      />

      <Shelf {...(await getHomeShelf('ultimas-unidades'))} />
      <Shelf {...(await getHomeShelf('novidades'))} />

      <Highlights />
    </main>
  );
}
