export const revalidate = 60 * 5; // 5 min

export default async function Products() {
  const produtos = await fetch('https://api.exemplo/produtos', {
  }).then(r => r.json());

  return (
    <ul>
      {produtos.map((p: any) => <li key={p.id}>{p.nome} — R$ {p.preco}</li>)}
    </ul>
  );
}