/*
 * Formato dos dados de navegação que o header recebe por prop.
 *
 * Estes tipos são declarados AQUI, no pacote, e não importados de
 * `apps/storefront/lib/categories.ts`. O pacote não pode depender de uma zona —
 * a seta aponta no outro sentido. São estruturalmente compatíveis com o
 * `Category`/`Department` do storefront, então a zona passa o resultado de
 * `getCategoryTree()` / `getFeaturedCategories()` direto, sem conversão.
 *
 * `count` é opcional de propósito: o header não usa a contagem para nada, e
 * exigi-la obrigaria qualquer outro consumidor a inventar um número.
 *
 * O prefixo é `Nav`, não `Shell`: o vocabulário "shell"/"casca" descrevia um
 * agrupamento que o Stencil IMPUNHA (header e footer num pacote, uma versão, um
 * hydrate app) e que não existe mais. Estes tipos descrevem navegação — é isso
 * que eles são, independente de quem os consome.
 */

export type NavCategory = {
  slug: string;
  name: string;
  href: string;
  count?: number;
};

export type NavDepartment = NavCategory & {
  children: NavCategory[];
};

export type NavZone = 'storefront' | 'blog';
