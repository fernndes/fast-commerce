import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Gera `data/categories.json` — a navegação por categorias que AS DUAS ZONAS
 * consomem.
 *
 * A leitura do dump do catálogo (`big.json`) acontece AQUI, em build time, e
 * não em runtime dentro de cada zona. Duas razões:
 *
 * 1. O blog não tem catálogo. Se o header dependesse de `getCatalog()`, o blog
 *    teria que carregar 13 MB de produtos para desenhar um menu de ~30 links.
 *    No mundo real esses dados viriam de uma base comum (ou de um serviço de
 *    navegação); aqui o equivalente honesto é uma projeção compartilhada,
 *    materializada uma vez.
 * 2. Rótulo e ordem são EDITORIAIS (ver ADR 0010 do storefront) — não saem dos
 *    dados. Eles vivem neste script, que é o único lugar onde a curadoria é
 *    aplicada.
 *
 * O caminho do dump é o único acoplamento restante com a zona storefront, e é
 * de ferramenta, não de runtime: nada em `src/` conhece `big.json`. Trocar a
 * origem por um endpoint é mexer só neste arquivo.
 */

const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '..', '..', '..');

const CATALOGO =
  process.env.CATALOG_FILE ?? path.join(RAIZ, 'apps', 'storefront', 'data', 'big.json');
const SAIDA = path.join(aqui, '..', 'data', 'categories.json');

// Rótulo editorial: sem entrada aqui, a categoria não aparece no menu. Ver ADR 0010.
const LABELS = {
  // departamentos
  mercearia: 'Mercearia',
  bebidas: 'Bebidas',
  'higiene-e-limpeza': 'Higiene e Limpeza',
  'acougue-e-peixaria': 'Açougue e Peixaria',
  hortifruti: 'Hortifruti',
  'laticinios-e-frios': 'Laticínios e Frios',
  lancamentos: 'Lançamentos',

  // subcategorias
  'graos-e-cereais': 'Grãos e cereais',
  'macarrao-e-massas': 'Macarrão e massas',
  'oleos-e-molhos': 'Óleos e molhos',
  'enlatados-e-conservas': 'Enlatados e conservas',
  'sucos-e-refrigerantes': 'Sucos e refrigerantes',
  aguas: 'Águas',
  'cervejas-e-vinhos': 'Cervejas e vinhos',
  'cafes-e-chas': 'Cafés e chás',
  'produtos-de-limpeza': 'Produtos de limpeza',
  'higiene-pessoal': 'Higiene pessoal',
  'papel-e-descartaveis': 'Papel e descartáveis',
  lavanderia: 'Lavanderia',
  'carnes-bovinas': 'Carnes bovinas',
  aves: 'Aves',
  'peixes-e-frutos-do-mar': 'Peixes e frutos do mar',
  embutidos: 'Embutidos',
  frutas: 'Frutas',
  verduras: 'Verduras',
  legumes: 'Legumes',
  leites: 'Leites',
  queijos: 'Queijos',
  iogurtes: 'Iogurtes',
  novidades: 'Novidades',
};

/**
 * Ordem dos departamentos no menu. Não é a ordem de contagem: "Lançamentos"
 * tem 185 produtos e mesmo assim merece estar visível. Departamento fora
 * desta lista é ordenado depois, pelo tamanho.
 */
const DEPT_ORDER = [
  'mercearia',
  'bebidas',
  'higiene-e-limpeza',
  'acougue-e-peixaria',
  'hortifruti',
  'laticinios-e-frios',
  'lancamentos',
];

/** Atalhos da barra horizontal do header — não a árvore inteira. */
const FEATURED = [
  'mercearia',
  'hortifruti',
  'acougue-e-peixaria',
  'bebidas',
  'higiene-e-limpeza',
  'lancamentos',
];

const categoryHref = (slug) => `/categorias/${slug}`;

const bruto = JSON.parse(await readFile(CATALOGO, 'utf8'));

/** slug de departamento → (slug de subcategoria → contagem) */
const porDepartamento = new Map();
const contagemSub = new Map();

for (const produto of bruto) {
  const [departamento = '', subcategoria = ''] = produto.categories ?? [];

  const subs = porDepartamento.get(departamento) ?? new Map();
  subs.set(subcategoria, (subs.get(subcategoria) ?? 0) + 1);
  porDepartamento.set(departamento, subs);

  contagemSub.set(subcategoria, (contagemSub.get(subcategoria) ?? 0) + 1);
}

// Guarda contra slug que seria departamento E subcategoria — ver ADR 0010.
for (const slug of porDepartamento.keys()) {
  if (contagemSub.has(slug)) {
    throw new Error(
      `[nav] slug "${slug}" é departamento E subcategoria: ` +
        `os dois resolveriam a mesma rota /categorias/${slug}.`,
    );
  }
}

const total = (subs) => [...subs.values()].reduce((soma, n) => soma + n, 0);

const rank = (slug) => {
  const index = DEPT_ORDER.indexOf(slug);
  return index === -1 ? DEPT_ORDER.length : index;
};

const departments = [...porDepartamento.keys()]
  // Sem rótulo, fora do menu — a válvula editorial.
  .filter((slug) => LABELS[slug])
  .sort(
    (a, b) =>
      rank(a) - rank(b) || total(porDepartamento.get(b)) - total(porDepartamento.get(a)),
  )
  .map((slug) => {
    const subs = porDepartamento.get(slug);

    return {
      slug,
      name: LABELS[slug],
      href: categoryHref(slug),
      count: total(subs),
      children: [...subs.keys()]
        .filter((sub) => LABELS[sub] && subs.get(sub) > 0)
        .sort((a, b) => LABELS[a].localeCompare(LABELS[b], 'pt-BR'))
        .map((sub) => ({
          slug: sub,
          name: LABELS[sub],
          href: categoryHref(sub),
          count: subs.get(sub),
        })),
    };
  })
  .filter((dept) => dept.count > 0);

// Fail loud: destaque que não existe na árvore é erro de curadoria, não um
// buraco silencioso na barra do header. Ver ADR 0010.
const achar = (slug) => {
  for (const dept of departments) {
    if (dept.slug === slug) {
      return { slug: dept.slug, name: dept.name, href: dept.href, count: dept.count };
    }
    const filho = dept.children.find((child) => child.slug === slug);
    if (filho) return filho;
  }
  return null;
};

const featured = FEATURED.map((slug) => {
  const categoria = achar(slug);
  if (!categoria) throw new Error(`[nav] destaque "${slug}" não existe na árvore.`);
  return categoria;
});

await writeFile(SAIDA, `${JSON.stringify({ departments, featured }, null, 2)}\n`, 'utf8');

console.log(
  `[nav] ${departments.length} departamentos, ` +
    `${departments.reduce((n, d) => n + d.children.length, 0)} subcategorias → ${path.relative(RAIZ, SAIDA)}`,
);
