import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SkuSelector } from '@/components/product/sku-selector';
import { getProductBySlug } from '@/lib/catalog';
import { findCategory } from '@/lib/categories';

export const revalidate = 3600;

/**
 * Lista VAZIA de propósito: nenhuma PDP é gerada no build, e cada uma é
 * renderizada e cacheada na primeira visita (ISR sob demanda), respeitando o
 * `revalidate` acima.
 *
 * Antes isto devolvia `getAllProducts().map(...)` — com 10.000 produtos seriam
 * 10.000 páginas no build, minutos de compilação e um `.next` gigante para
 * atender uma cauda que quase ninguém acessa. A documentação do Next é
 * explícita: para renderizar todos os caminhos em runtime, retorne `[]`
 * (remover a função não é a mesma coisa).
 *
 * Se um dia houver sinal de popularidade, o meio-termo é devolver aqui os ~50
 * slugs mais vistos e deixar o resto sob demanda.
 */
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<'/produtos/[slug]'>) {
  const { slug } = await params;
  const produto = await getProductBySlug(slug);

  if (!produto) return { title: 'Produto não encontrado — Fast Commerce' };

  return {
    title: `${produto.name} — Fast Commerce`,
    description: produto.description || `${produto.name} por ${produto.brand}.`,
  };
}

export default async function Product({ params }: PageProps<'/produtos/[slug]'>) {
  const { slug } = await params;
  const produto = await getProductBySlug(slug);

  // 404 de verdade, não um `<h1>` de desculpa com status 200: um slug que não
  // existe precisa dizer isso ao browser e ao crawler.
  if (!produto) notFound();

  // A trilha mostra o RÓTULO editorial ("Ração úmida"), não o slug cru
  // ("racao-umida"). Categoria sem rótulo cai no slug em vez de sumir: numa
  // trilha, o degrau intermediário faltando é pior que um nome feio.
  const [departamento, subcategoria] = await Promise.all([
    findCategory(produto.department),
    findCategory(produto.subcategory),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6">
      <nav aria-label="Trilha" className="flex flex-wrap items-center gap-1 text-sm text-zinc-500">
        <Link href="/produtos" className="hover:underline">
          Produtos
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/categorias/${produto.department}`} className="hover:underline">
          {departamento?.name ?? produto.department}
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/categorias/${produto.subcategory}`} className="hover:underline">
          {subcategoria?.name ?? produto.subcategory}
        </Link>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <Image
            src={produto.images[0] ?? produto.thumb_image}
            alt={produto.name}
            width={600}
            height={600}
            // A imagem principal da PDP é o LCP da rota: é a única do site,
            // fora do slide 0 do hero, que vale priorizar.
            priority
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="h-auto w-full rounded-xl bg-zinc-100 object-cover dark:bg-zinc-900"
          />

          {produto.images.length > 1 && (
            <ul className="grid grid-cols-4 gap-3">
              {/* Miniaturas ainda não trocam a principal — isso exigiria estado,
                  e a galeria interativa não faz parte deste escopo. */}
              {produto.images.slice(1).map((image, i) => (
                <li key={image}>
                  <Image
                    src={image}
                    alt={`${produto.name} — imagem ${i + 2}`}
                    width={150}
                    height={150}
                    sizes="12vw"
                    className="h-auto w-full rounded-lg bg-zinc-100 object-cover dark:bg-zinc-900"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-2">
            <p className="text-sm text-zinc-500 uppercase">{produto.brand}</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{produto.name}</h1>
          </header>

          {/*
            Preço, estoque e botão vivem no seletor: eles pertencem ao SKU
            escolhido, não ao produto. A página não exibe `priceFrom` — aqui
            existe uma variação selecionada, e ela tem preço próprio.
          */}
          <SkuSelector items={produto.items} tipoOpcao={produto.tipoOpcao} />

          {produto.description && (
            <section className="flex flex-col gap-2 border-t border-black/10 pt-6 dark:border-white/15">
              <h2 className="text-sm font-semibold">Descrição</h2>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {produto.description}
              </p>
            </section>
          )}

          <section className="flex flex-col gap-2 border-t border-black/10 pt-6 dark:border-white/15">
            <h2 className="text-sm font-semibold">Ficha técnica</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <dt>Marca</dt>
              <dd>{produto.brand}</dd>
              <dt>Variações</dt>
              <dd>
                {produto.items.length} por {produto.tipoOpcao}
              </dd>
              <dt>Código</dt>
              <dd>{produto.id}</dd>
            </dl>
          </section>
        </div>
      </div>
    </main>
  );
}
