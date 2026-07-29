export const dynamic = 'force-dynamic'; // disable cache, run each request

export default async function SearchResult({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const resultados = await fetch(
    `https://api.exemplo/busca?q=${encodeURIComponent(q ?? '')}`,
    { cache: 'no-store' } // este fetch nunca é cacheado
  ).then(r => r.json());

  return (
    <ul>
      {resultados.map((r: any) => <li key={r.id}>{r.nome}</li>)}
    </ul>
  );
}