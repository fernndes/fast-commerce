import categorias from '../data/categories.json';

// Navegação por categorias — a fonte ÚNICA para as duas zonas. Import
// estático, materializado por `scripts/generate-categories.mjs`. Ver ADR
// 0004, raiz (docs/adr/0004-casca-como-componentes-react-em-workspace.md),
// seção "um header só, e packages/nav como fonte da navegação".

export type Category = {
  slug: string;
  name: string;
  href: string;
  /** Quantos produtos a categoria tem. Serve para não linkar categoria vazia. */
  count: number;
};

export type Department = Category & { children: Category[] };

export const categoryHref = (slug: string) => `/categorias/${slug}`;

const dados = categorias as { departments: Department[]; featured: Category[] };

/** Árvore completa: departamentos e suas subcategorias. Usada pelo mega menu. */
export function getCategoryTree(): Department[] {
  return dados.departments;
}

/** Subconjunto em destaque, plano, para a barra de links do header. */
export function getFeaturedCategories(): Category[] {
  return dados.featured;
}

/**
 * Resolve um slug de departamento OU de subcategoria — os dois são páginas de
 * categoria válidas. Retorna `null` para que a rota chame `notFound()`.
 */
export function findCategory(slug: string): Category | null {
  for (const dept of dados.departments) {
    if (dept.slug === slug) {
      return {
        slug: dept.slug,
        name: dept.name,
        href: dept.href,
        count: dept.count,
      };
    }
    const filho = dept.children.find((child) => child.slug === slug);
    if (filho) return filho;
  }
  return null;
}

export function getAllCategorySlugs(): string[] {
  return dados.departments.flatMap((dept) => [
    dept.slug,
    ...dept.children.map((child) => child.slug),
  ]);
}
