import { getProductsByCategory } from '@/lib/categories';
import { getAllProducts, type Product } from '@/lib/products';

/**
 * Curadoria da home. As prateleiras são conteúdo editorial — quais existem, em
 * que ordem e com que nome é decisão de negócio, não algo que se derive do
 * catálogo. Por isso ficam declaradas aqui, e não espalhadas pelo JSX da página.
 *
 * `app/page.tsx` só decide o ARRANJO (o que vem antes, onde entra banner). Se
 * amanhã "Mais vendidos" passar a vir de um endpoint de telemetria, muda a
 * função `produtos` desta lista e mais nada — a página não sabe a diferença.
 *
 * Como o catálogo é pequeno (30 SKUs), os recortes se sobrepõem de propósito:
 * um mesmo produto aparece em várias prateleiras, exatamente como numa home de
 * varejo real.
 */

export type HomeShelf = {
  id: string;
  title: string;
  /** Destino do "ver tudo" do cabeçalho da prateleira. */
  href: string;
  products: Product[];
};

/**
 * Teto de itens por régua. Ninguém arrasta 30 cards, e cada card a mais é DOM
 * (e um `<img>` lazy) pago por todas as 14 prateleiras da página.
 */
const MAX_ITEMS = 12;

/** Percentual de desconto — usado só para ordenar a régua de ofertas. */
const desconto = (produto: Product) => (produto.price - produto.sellingPrice) / produto.price;

/**
 * União de categorias, sem duplicar produto e preservando a ordem do catálogo.
 * `getProductsByCategory` já resolve departamento e tag, então dá para misturar
 * os dois (`'higiene-e-banho'` + `'saude'`) numa prateleira só.
 */
function porCategoria(...slugs: string[]) {
  return () => {
    const ids = new Set(slugs.flatMap((slug) => getProductsByCategory(slug).map((p) => p.id)));
    return getAllProducts().filter((produto) => ids.has(produto.id));
  };
}

type ShelfSpec = Omit<HomeShelf, 'products'> & { produtos: () => Product[] };

const SPECS: ShelfSpec[] = [
  {
    id: 'mais-vendidos',
    title: 'Mais vendidos',
    href: '/produtos',
    // Não há telemetria de vendas no mock: estoque alto é a melhor proxy de
    // giro que os dados oferecem. Ponto de troca óbvio quando houver API.
    produtos: () => [...getAllProducts()].sort((a, b) => b.stock - a.stock),
  },
  {
    id: 'ofertas',
    title: 'Ofertas do dia',
    href: '/produtos',
    produtos: () => [...getAllProducts()].sort((a, b) => desconto(b) - desconto(a)),
  },
  {
    id: 'alimentacao',
    title: 'Ração e alimentação',
    href: '/categorias/alimentacao',
    produtos: porCategoria('alimentacao'),
  },
  {
    id: 'gatos',
    title: 'Tudo para gatos',
    href: '/categorias/gatos',
    produtos: porCategoria('gatos'),
  },
  {
    id: 'caes',
    title: 'Tudo para cães',
    href: '/categorias/caes',
    produtos: porCategoria('caes'),
  },
  {
    id: 'higiene',
    title: 'Higiene, banho e cuidados',
    href: '/categorias/higiene-e-banho',
    produtos: porCategoria('higiene-e-banho', 'saude-e-bem-estar'),
  },
  {
    id: 'passeio',
    title: 'Passeio e acessórios',
    href: '/categorias/passeio-e-acessorios',
    produtos: porCategoria('passeio-e-acessorios'),
  },
  {
    id: 'casa',
    title: 'Casa e conforto',
    href: '/categorias/casa-e-conforto',
    produtos: porCategoria('casa-e-conforto'),
  },
  {
    id: 'ate-50',
    title: 'Tudo até R$ 50',
    href: '/produtos',
    produtos: () =>
      getAllProducts()
        .filter((produto) => produto.sellingPrice <= 5000)
        .sort((a, b) => a.sellingPrice - b.sellingPrice),
  },
  {
    id: 'brincar',
    title: 'Hora de brincar (e petiscar)',
    href: '/categorias/brinquedos',
    produtos: porCategoria('brinquedos', 'petiscos'),
  },
  {
    id: 'premium',
    title: 'Seleção premium',
    href: '/categorias/racao',
    produtos: () =>
      getAllProducts()
        .filter((produto) => produto.sellingPrice >= 15000)
        .sort((a, b) => b.sellingPrice - a.sellingPrice),
  },
  {
    id: 'frete-gratis',
    title: 'Frete grátis a partir de R$ 99',
    href: '/lp/frete-gratis',
    produtos: () => getAllProducts().filter((produto) => produto.sellingPrice >= 9900),
  },
  {
    id: 'ultimas-unidades',
    title: 'Últimas unidades',
    href: '/produtos',
    produtos: () =>
      getAllProducts()
        .filter((produto) => produto.stock <= 25)
        .sort((a, b) => a.stock - b.stock),
  },
  {
    id: 'novidades',
    title: 'Chegou agora',
    href: '/produtos',
    // Sem campo de data no mock, o id crescente é a ordem de entrada no catálogo.
    produtos: () => [...getAllProducts()].reverse(),
  },
];

/**
 * Montado uma vez por processo, como a árvore de categorias: a home é a rota
 * mais acessada do site e nada aqui depende do request.
 */
const shelves = new Map<string, HomeShelf>(
  SPECS.map(({ produtos, ...spec }) => [
    spec.id,
    { ...spec, products: produtos().slice(0, MAX_ITEMS) },
  ]),
);

/**
 * Uma prateleira pelo id. Lança em id desconhecido — é typo de quem monta a
 * página, e o build é a hora certa de descobrir. Prateleira que ficou sem
 * produto não lança: o `<Shelf>` simplesmente não renderiza.
 */
export function getHomeShelf(id: string): HomeShelf {
  const shelf = shelves.get(id);
  if (!shelf) {
    throw new Error(
      `[home] prateleira "${id}" não existe. Disponíveis: ${[...shelves.keys()].join(', ')}.`,
    );
  }
  return shelf;
}

export function getHomeShelves(): HomeShelf[] {
  return [...shelves.values()];
}
