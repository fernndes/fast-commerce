/**
 * Valida todo `href` de banner contra as rotas e o catálogo que existem de fato.
 *
 * Por que existe: `getPromoBanners()` já falha alto quando a SEÇÃO não existe,
 * mas o `href` é `string` livre — nada olhava para ele. Foi assim que 11 links
 * `/lp/*` ficaram apontando para uma rota que nunca foi criada, servindo 404
 * na home sem quebrar build nem teste.
 *
 * A validação não reimplementa regra nenhuma: os slugs saem de
 * `getAllCategorySlugs()` (derivado do `big.json`) e a query string passa pelo
 * mesmo `parseProductQuery()` que a PLP e a `/api/produtos` usam. Se o parser
 * ficar mais estrito amanhã, este checker fica junto.
 *
 * Uso: `npm run check:links` (a partir de apps/storefront).
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { parseProductQuery } from '@/lib/query.ts';
import { getAllCategorySlugs } from '@/lib/categories.ts';

const root = path.resolve(import.meta.dirname, '..');

/** Rotas estáticas existentes em `app/`. Um href fora daqui é 404 certo. */
const ROTAS_ESTATICAS = new Set(['/', '/busca', '/categorias', '/produtos']);

async function lerJSON(rel) {
  return JSON.parse(await readFile(path.join(root, rel), 'utf8'));
}

/** Todo href do arquivo, com um rótulo que diga onde procurar quando falhar. */
function coletar(dados, arquivo) {
  const secoes = Array.isArray(dados) ? { '': dados } : dados;
  return Object.entries(secoes).flatMap(([secao, banners]) =>
    banners.map((banner) => ({
      href: banner.href,
      onde: `${arquivo} → ${secao ? `${secao}/` : ''}${banner.id}`,
    })),
  );
}

function validar(href, slugs) {
  if (typeof href !== 'string' || !href.startsWith('/')) {
    return 'href ausente ou não é um caminho absoluto';
  }

  const [caminho, queryString = ''] = href.split('?');

  if (caminho.startsWith('/categorias/')) {
    const slug = caminho.slice('/categorias/'.length);
    return slugs.has(slug) ? null : `categoria "${slug}" não existe no catálogo`;
  }

  if (!ROTAS_ESTATICAS.has(caminho)) {
    return `rota "${caminho}" não existe em app/`;
  }

  if (!queryString) return null;

  // `&amp;` num JSON de dados vira parâmetro literal `amp;sort` — o parser
  // recusaria, mas o erro sairia confuso.
  if (queryString.includes('&amp;')) return 'query string com `&amp;` (use `&`)';

  const resultado = parseProductQuery(new URLSearchParams(queryString));
  return resultado.ok ? null : `query inválida: ${resultado.error}`;
}

const slugs = new Set(await getAllCategorySlugs());

const links = [
  ...coletar(await lerJSON('data/banners.json'), 'data/banners.json'),
  ...coletar(await lerJSON('data/promo-banners.json'), 'data/promo-banners.json'),
];

const falhas = links
  .map((link) => ({ ...link, erro: validar(link.href, slugs) }))
  .filter((link) => link.erro);

if (falhas.length > 0) {
  console.error(`\n[check-links] ${falhas.length} de ${links.length} links quebrados:\n`);
  for (const { onde, href, erro } of falhas) {
    console.error(`  ✗ ${onde}\n    ${href}\n    ${erro}\n`);
  }
  process.exit(1);
}

console.log(`[check-links] ok — ${links.length} links, ${slugs.size} categorias.`);
