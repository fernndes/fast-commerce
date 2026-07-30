import { BannerSection } from '@/components/banner/banner-section';
import { CategoryTiles } from '@/components/category-tiles/category-tiles';
import { Hero } from '@/components/hero/hero';
import { Highlights } from '@/components/highlights/highlights';
import { Shelf } from '@/components/shelf/shelf';
import { getHeroBanners, getPromoBanners } from '@/lib/banners';
import { getHomeShelf } from '@/lib/home';

export const revalidate = 300;

/**
 * Home — só ARRANJO. Quais produtos entram em cada prateleira mora em
 * `lib/home.ts`; qual arte e para onde cada banner leva, em
 * `data/promo-banners.json`. Aqui fica a única decisão que é de fato desta
 * página: a ordem em que as coisas aparecem.
 *
 * O ritmo é o de home de varejo: blocos de duas ou três prateleiras cortados
 * por uma faixa editorial, para a rolagem não virar uma esteira de cards. As
 * primeiras prateleiras são as de maior intenção (mais vendidos, ofertas); as
 * de garimpo (últimas unidades, novidades) ficam no fim.
 *
 * Tudo abaixo do hero é lazy — imagem de banner e de card só baixa ao chegar
 * perto da viewport, e os `<Link>` de banner vão com `prefetch={false}`. Sem
 * isso, uma página com ~60 links viraria uma tempestade de requests durante a
 * rolagem e derrubaria o orçamento de performance do `lighthouserc.js`.
 */
export default async function Home() {
  return (
    <main className="flex flex-1 flex-col gap-12 pb-16">
      <h1 className="sr-only">Fast Commerce — tudo para o seu pet</h1>

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
        id="semana-do-pet"
        banners={getPromoBanners('semana-do-pet')}
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
