export const revalidate = 3600; // 1h

// diz ao Next QUAIS páginas pré-gerar no build
export async function generateStaticParams() {
  const produtos = await fetch('https://api.exemplo/produtos').then(r => r.json());
  return produtos.map((p: any) => ({ slug: p.slug }));
}

export default async function Product({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const produto = await fetch(`https://api.exemplo/produtos/${slug}`).then(r => r.json());

  return <h1>{produto.nome} — R$ {produto.preco}</h1>;
}