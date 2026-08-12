import {
  getCatalog,
  listProducts,
  type Page,
  type Product,
  type ProductQuery,
} from '@/lib/catalog';

// Camada de navegação: hierarquia vem dos dados, rótulo/ordem são editoriais.
// Ver ADR 0010 (adr/0010-navegacao-e-curadoria-editorial-fail-loud.md).

// Rótulo editorial: sem entrada aqui, a categoria não aparece no menu. Ver ADR 0010.
const LABELS: Record<string, string> = {
  // departamentos
  alimentacao: 'Alimentação',
  brinquedos: 'Brinquedos',
  higiene: 'Higiene e Cuidados',
  acessorios: 'Acessórios',
  'camas-e-casinhas': 'Camas e Casinhas',
  farmacia: 'Farmácia',
  lancamentos: 'Lançamentos',

  // subcategorias
  'racao-seca': 'Ração seca',
  'racao-umida': 'Ração úmida',
  petiscos: 'Petiscos',
  suplementos: 'Suplementos',
  mordedores: 'Mordedores',
  bolas: 'Bolas',
  pelucia: 'Pelúcia',
  interativos: 'Brinquedos interativos',
  shampoo: 'Shampoo e condicionador',
  escovas: 'Escovas e pentes',
  tapetes: 'Tapetes higiênicos',
  cortadores: 'Cortadores de unha',
  coleiras: 'Coleiras',
  peitorais: 'Peitorais',
  guias: 'Guias',
  comedouros: 'Comedouros e bebedouros',
  camas: 'Camas',
  casinhas: 'Casinhas',
  colchonetes: 'Colchonetes',
  antipulgas: 'Antipulgas',
  vermifugos: 'Vermífugos',
  vitaminas: 'Vitaminas',
  novidades: 'Novidades',
};

/**
 * Ordem dos departamentos no menu. Não é a ordem de contagem: "Lançamentos"
 * tem 185 produtos e mesmo assim merece estar visível. Departamento fora
 * desta lista é ordenado depois, pelo tamanho.
 */
const DEPT_ORDER = [
  'alimentacao',
  'brinquedos',
  'higiene',
  'acessorios',
  'camas-e-casinhas',
  'farmacia',
  'lancamentos',
];

/** Atalhos da barra horizontal do header — não a árvore inteira. */
const FEATURED = ['alimentacao', 'racao-seca', 'petiscos', 'brinquedos', 'higiene', 'lancamentos'];

export type Category = {
  slug: string;
  name: string;
  href: string;
  /** Quantos produtos a categoria tem. Serve para não linkar categoria vazia. */
  count: number;
};

export type Department = Category & { children: Category[] };

export const categoryHref = (slug: string) => `/categorias/${slug}`;

async function buildTree(): Promise<Department[]> {
  const { byDept, bySub, deptCounts, subCounts } = await getCatalog();

  // Guarda contra slug que seria departamento E subcategoria — ver ADR 0010.
  for (const slug of byDept.keys()) {
    if (bySub.has(slug)) {
      throw new Error(
        `[categories] slug "${slug}" é departamento E subcategoria: ` +
          `os dois resolveriam a mesma rota /categorias/${slug}.`,
      );
    }
  }

  const rank = (slug: string) => {
    const index = DEPT_ORDER.indexOf(slug);
    return index === -1 ? DEPT_ORDER.length : index;
  };

  return [...byDept.keys()]
    // Sem rótulo, fora do menu — a válvula editorial.
    .filter((slug) => LABELS[slug])
    .sort((a, b) => rank(a) - rank(b) || (deptCounts.get(b) ?? 0) - (deptCounts.get(a) ?? 0))
    .map((slug) => {
      const produtos = byDept.get(slug) ?? [];

      // As subcategorias do departamento saem dos produtos DELE, sem varrer o
      // catálogo inteiro: `byDept` já é o recorte.
      const subs = new Map<string, number>();
      for (const produto of produtos) {
        subs.set(produto.subcategory, (subs.get(produto.subcategory) ?? 0) + 1);
      }

      return {
        slug,
        name: LABELS[slug],
        href: categoryHref(slug),
        count: deptCounts.get(slug) ?? 0,
        children: [...subs.keys()]
          .filter((sub) => LABELS[sub] && (subCounts.get(sub) ?? 0) > 0)
          .sort((a, b) => LABELS[a].localeCompare(LABELS[b], 'pt-BR'))
          .map((sub) => ({
            slug: sub,
            name: LABELS[sub],
            href: categoryHref(sub),
            count: subs.get(sub) ?? 0,
          })),
      };
    })
    .filter((dept) => dept.count > 0);
}

let cache: Promise<Department[]> | null = null;

/** Árvore completa: departamentos e suas subcategorias. Usada pelo mega menu. */
export function getCategoryTree(): Promise<Department[]> {
  cache ??= buildTree();
  return cache;
}

/** Subconjunto em destaque, plano, para a barra de links do header. */
export async function getFeaturedCategories(): Promise<Category[]> {
  const categorias = await Promise.all(FEATURED.map((slug) => findCategory(slug)));

  return categorias.map((categoria, i) => {
    if (!categoria) {
      throw new Error(`[categories] destaque "${FEATURED[i]}" não existe na árvore.`);
    }
    return categoria;
  });
}

/**
 * Resolve um slug de departamento OU de subcategoria — os dois são páginas de
 * categoria válidas. Retorna `null` para que a rota chame `notFound()`.
 */
export async function findCategory(slug: string): Promise<Category | null> {
  const tree = await getCategoryTree();

  for (const dept of tree) {
    if (dept.slug === slug) {
      return { slug: dept.slug, name: dept.name, href: dept.href, count: dept.count };
    }
    const filho = dept.children.find((child) => child.slug === slug);
    if (filho) return filho;
  }
  return null;
}

// `slug` vem DEPOIS do spread de propósito: `?category=` não sobrescreve a
// categoria do path. Ver ADR 0010.
export function getProductsByCategory(
  slug: string,
  query: ProductQuery = {},
): Promise<Page<Product>> {
  return listProducts({ ...query, category: slug });
}

// Sem consumidor ativo hoje; mantida para um futuro `sitemap.ts`. Ver ADR 0010.
export async function getAllCategorySlugs(): Promise<string[]> {
  const tree = await getCategoryTree();
  return tree.flatMap((dept) => [dept.slug, ...dept.children.map((child) => child.slug)]);
}
