import { getAllProducts } from '@/lib/products';

export const revalidate = 300;

export default async function Products() {
  const produtos = getAllProducts();
  return (
    <ul>
      {produtos.map(p => <li key={p.id}>{p.name} — R$ {p.sellingPrice}</li>)}
    </ul>
  );
}