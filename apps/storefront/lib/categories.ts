import { getAllProducts, type Product } from '@/lib/products';

/**
 * Camada de dados da navegação. Header e footer aparecem em TODA página, então
 * a árvore de categorias é montada uma vez por processo (constante de módulo) e
 * compartilhada por todas as rotas — nada é recalculado por request.
 *
 * Hoje a origem é `data/products.json` (import síncrono, custo zero). Quando
 * virar API, o ponto de troca é `getCategoryTree`: ela vira `async` com
 * `fetch(..., { next: { revalidate } })`. O resto do arquivo não muda, e nenhum
 * componente precisa saber a diferença.
 */

/**
 * Rótulo de cada tag que existe em `product.categories`. Esta lista é
 * editorial: uma tag sem rótulo aqui simplesmente não aparece na navegação.
 * É a válvula que impede uma tag nova no CMS de vazar direto pro menu.
 */
const LABELS: Record<string, string> = {
  racao: 'Ração',
  seca: 'Ração seca',
  umida: 'Ração úmida',
  natural: 'Linha natural',
  petiscos: 'Petiscos',
  comedouros: 'Comedouros e bebedouros',
  higiene: 'Higiene',
  banho: 'Banho',
  escovas: 'Escovas e pelos',
  saude: 'Saúde',
  suplementos: 'Suplementos',
  medicamentos: 'Medicamentos',
  acessorios: 'Acessórios',
  coleiras: 'Coleiras',
  guias: 'Guias',
  peitorais: 'Peitorais',
  transporte: 'Transporte',
  vestuario: 'Vestuário',
  moveis: 'Móveis',
  caminhas: 'Caminhas',
  casinhas: 'Casinhas',
  brinquedos: 'Brinquedos',
  caes: 'Cães',
  gatos: 'Gatos',
  filhotes: 'Filhotes',
  senior: 'Sênior',
};

/**
 * As tags do produto são planas — `['racao', 'seca', 'gatos']`. A hierarquia do
 * menu não está nos dados e não deve ser inferida deles: ordem, agrupamento e
 * nome de departamento são decisão de negócio. Ficam explícitos aqui.
 *
 * O slug do departamento precisa ser distinto de qualquer tag (as duas coisas
 * dividem a rota `/categorias/[slug]`). O invariante é checado no build.
 */
const DEPARTMENTS: { slug: string; name: string; tags: string[] }[] = [
  {
    slug: 'alimentacao',
    name: 'Alimentação',
    tags: ['racao', 'seca', 'umida', 'natural', 'petiscos', 'comedouros'],
  },
  {
    slug: 'para-seu-pet',
    name: 'Para seu pet',
    tags: ['caes', 'gatos', 'filhotes', 'senior'],
  },
  {
    slug: 'higiene-e-banho',
    name: 'Higiene e Banho',
    tags: ['higiene', 'banho', 'escovas'],
  },
  {
    slug: 'saude-e-bem-estar',
    name: 'Saúde e Bem-estar',
    tags: ['saude', 'suplementos', 'medicamentos'],
  },
  {
    slug: 'passeio-e-acessorios',
    name: 'Passeio e Acessórios',
    tags: ['acessorios', 'coleiras', 'guias', 'peitorais', 'transporte', 'vestuario'],
  },
  {
    slug: 'casa-e-conforto',
    name: 'Casa e Conforto',
    tags: ['moveis', 'caminhas', 'casinhas', 'brinquedos'],
  },
];

/** Categorias da barra horizontal do header — atalhos, não a árvore inteira. */
const FEATURED = ['caes', 'gatos', 'alimentacao', 'petiscos', 'brinquedos', 'higiene-e-banho'];

export type Category = {
  slug: string;
  name: string;
  href: string;
  /** Quantos produtos a categoria tem. Serve para não linkar categoria vazia. */
  count: number;
};

export type Department = Category & { children: Category[] };

export const categoryHref = (slug: string) => `/categorias/${slug}`;

function buildTree(): Department[] {
  const produtos = getAllProducts();

  const countByTag = new Map<string, number>();
  for (const produto of produtos) {
    for (const tag of produto.categories) {
      countByTag.set(tag, (countByTag.get(tag) ?? 0) + 1);
    }
  }

  return DEPARTMENTS.map((dept) => {
    if (LABELS[dept.slug]) {
      throw new Error(
        `[categories] slug de departamento "${dept.slug}" colide com uma tag de produto: ` +
          `os dois resolveriam a mesma rota /categorias/${dept.slug}.`,
      );
    }

    const tags = new Set(dept.tags);

    return {
      slug: dept.slug,
      name: dept.name,
      href: categoryHref(dept.slug),
      // Produtos distintos do departamento — não a soma dos filhos, senão um
      // produto com duas tags do mesmo grupo contaria dobrado.
      count: produtos.filter((p) => p.categories.some((tag) => tags.has(tag))).length,
      children: dept.tags
        .filter((tag) => (countByTag.get(tag) ?? 0) > 0)
        .map((tag) => ({
          slug: tag,
          name: LABELS[tag] ?? tag,
          href: categoryHref(tag),
          count: countByTag.get(tag) ?? 0,
        })),
    };
  }).filter((dept) => dept.count > 0);
}

const tree = buildTree();

/** Árvore completa: departamentos e suas subcategorias. Usada pelo mega menu. */
export function getCategoryTree(): Department[] {
  return tree;
}

/** Subconjunto em destaque, plano, para a barra de links do header. */
export function getFeaturedCategories(): Category[] {
  return FEATURED.map((slug) => {
    const categoria = findCategory(slug);
    if (!categoria) {
      throw new Error(`[categories] destaque "${slug}" não existe na árvore.`);
    }
    return categoria;
  });
}

/**
 * Resolve um slug de departamento OU de tag — os dois são páginas de categoria
 * válidas. Retorna `null` para que a rota chame `notFound()`.
 */
export function findCategory(slug: string): Category | null {
  for (const dept of tree) {
    if (dept.slug === slug) {
      return { slug: dept.slug, name: dept.name, href: dept.href, count: dept.count };
    }
    const filho = dept.children.find((child) => child.slug === slug);
    if (filho) return filho;
  }
  return null;
}

/** Tags que um slug de categoria cobre: uma para folha, várias para departamento. */
function tagsOf(slug: string): string[] {
  const dept = DEPARTMENTS.find((d) => d.slug === slug);
  return dept ? dept.tags : [slug];
}

export function getProductsByCategory(slug: string): Product[] {
  const tags = new Set(tagsOf(slug));
  return getAllProducts().filter((p) => p.categories.some((tag) => tags.has(tag)));
}

/** Todos os slugs navegáveis — alimenta o `generateStaticParams` da rota. */
export function getAllCategorySlugs(): string[] {
  return tree.flatMap((dept) => [dept.slug, ...dept.children.map((child) => child.slug)]);
}
