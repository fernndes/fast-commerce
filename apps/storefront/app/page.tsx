import { Hero } from '@/components/hero/hero';
import { Shelf } from '@/components/shelf/shelf';
import { getHeroBanners } from '@/lib/banners';
import { getAllProducts } from '@/lib/products';

export const revalidate = 300;

export default function Home() {
  const banners = getHeroBanners();
  const produtos = getAllProducts();

  return (
    <main className="flex flex-1 flex-col gap-12 pb-16">
      <h1 className="sr-only">Fast Commerce — tudo para o seu pet</h1>

      <Hero banners={banners} />

      <Shelf id="shelf-destaques" title="Mais vendidos" products={produtos.slice(0, 8)} />
      <Shelf id="shelf-ofertas" title="Ofertas da semana" products={produtos.slice(8, 16)} />
    </main>
  );
}
