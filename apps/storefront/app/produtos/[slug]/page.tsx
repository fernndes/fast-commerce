import { getAllProducts, getProductBySlug } from '@/lib/products';

export const revalidate = 3600;

export async function generateStaticParams() {
  return getAllProducts().map(p => ({ slug: p.slug }));
}

export default async function Product({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const produto = getProductBySlug(slug);
  if (!produto) {
    return (<h1>Produto não encontrado!</h1>)
  };
  return <h1>{produto.name} — R$ {produto.sellingPrice}</h1>;
}