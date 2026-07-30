#!/usr/bin/env node
/**
 * Gerador de produtos fictícios para o fast-commerce.
 *
 * Dois regimes:
 *   - base (padrão): ~400 produtos críveis, distribuição desigual por categoria.
 *                    Serve para home, PDP, categorias normais. Cabe no bundle.
 *   - volume:        milhares de produtos (sintéticos) para exercitar windowing
 *                    e busca em escala. NÃO deve ir para o bundle — leia via fs/API.
 *
 * Uso:
 *   node gen-products.mjs                 -> base (~400) em products.json
 *   node gen-products.mjs --volume        -> 10.000 em products.volume.json
 *   node gen-products.mjs --volume --count 5000 --out data/big.json
 *   node gen-products.mjs --seed 42       -> reprodutível (mesmo dataset sempre)
 *
 * Dependência: npm i -D @faker-js/faker
 */

import { faker } from "@faker-js/faker";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

// ---------- args ----------
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => {
  const i = args.indexOf(f);
  return i !== -1 && args[i + 1] ? args[i + 1] : d;
};

const VOLUME = has("--volume");
const COUNT = Number(val("--count", VOLUME ? 10000 : 400));
const OUT = val("--out", VOLUME ? "products.volume.json" : "products.json");
const SEED = Number(val("--seed", 1337)); // fixo por padrão => reprodutível

faker.seed(SEED); // mesmo seed => mesmo dataset, todo build. Bom para diffs e CI.

// ---------- taxonomia (decisão editorial, distribuição desigual de propósito) ----------
// pesos != => categorias gordas e magras, como loja real.
const CATEGORIES = [
  { slug: "alimentacao", nome: "Alimentação", weight: 34 }, // gorda
  { slug: "brinquedos", nome: "Brinquedos", weight: 20 },
  { slug: "higiene", nome: "Higiene e Cuidados", weight: 16 },
  { slug: "acessorios", nome: "Acessórios", weight: 14 },
  { slug: "camas-e-casinhas", nome: "Camas e Casinhas", weight: 9 },
  { slug: "farmacia", nome: "Farmácia", weight: 5 },
  { slug: "lancamentos", nome: "Lançamentos", weight: 2 }, // magra (cauda)
];

const SUBCATS = {
  "alimentacao": ["racao-seca", "racao-umida", "petiscos", "suplementos"],
  "brinquedos": ["mordedores", "bolas", "pelucia", "interativos"],
  "higiene": ["shampoo", "escovas", "tapetes", "cortadores"],
  "acessorios": ["coleiras", "peitorais", "guias", "comedouros"],
  "camas-e-casinhas": ["camas", "casinhas", "colchonetes"],
  "farmacia": ["antipulgas", "vermifugos", "vitaminas"],
  "lancamentos": ["novidades"],
};

// ---------- helpers ----------
const slugify = (s) =>
  s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const pickCategory = () => {
  const total = CATEGORIES.reduce((a, c) => a + c.weight, 0);
  let r = faker.number.float({ min: 0, max: total });
  for (const c of CATEGORIES) {
    if ((r -= c.weight) <= 0) return c;
  }
  return CATEGORIES[0];
};

const cdnImage = (id, i) =>
  // troque o host pelo seu S3/CloudFront quando tiver. Placeholder por enquanto.
  `https://images.fast-commerce.example/produtos/${id}/${i}.jpg`;

const usedSlugs = new Set();
const uniqueSlug = (base) => {
  let s = base, n = 2;
  while (usedSlugs.has(s)) s = `${base}-${n++}`;
  usedSlugs.add(s);
  return s;
};

// ---------- fábrica de produto ----------
function makeProduct(index, opts = {}) {
  const cat = opts.category ?? pickCategory();
  const name = opts.name ?? faker.commerce.productName();
  const id = String(opts.id ?? faker.number.int({ min: 1, max: 999999 }));
  const slug = uniqueSlug(slugify(name));
  const nImages = opts.nImages ?? faker.number.int({ min: 1, max: 4 });
  const prefixo = cat.slug.slice(0, 3).toUpperCase();

  const subcat = faker.helpers.arrayElement(SUBCATS[cat.slug] ?? [cat.slug]);
  const categories = [cat.slug, subcat];
  const images = Array.from({ length: nImages }, (_, i) => cdnImage(id, i));

  // opções coerentes: produto é de peso OU tamanho, nunca misturado
  const POR_PESO = ["500g", "1kg", "3kg", "10kg", "15kg"];
  const POR_TAMANHO = ["P", "M", "G", "GG"];
  const escala = faker.helpers.arrayElement([POR_PESO, POR_TAMANHO]);
  const nItems = Math.min(opts.nItems ?? faker.number.int({ min: 1, max: 5 }), escala.length);
  const opcoes = escala.slice(0, nItems).sort((a, b) => escala.indexOf(a) - escala.indexOf(b));

  // ITEMS (SKUs): aqui vivem preço e estoque
  const items = opcoes.map((opcao) => {
    const listPrice = faker.number.int({ min: 900, max: 89900 });
    const temDesconto = faker.datatype.boolean(0.3);
    return {
      itemId: `${id}-${opcao}`,
      sku: `${prefixo}-${slug.slice(0, 12).toUpperCase()}-${opcao}`.replace(/\s/g, ""),
      name: `${name} - ${opcao}`,
      opcao,
      images,
      offer: {
        listPrice,                                             // "de" (centavos)
        price: temDesconto ? Math.round(listPrice * faker.number.float({ min: 0.6, max: 0.9 })) : listPrice, // "por"
        availableQuantity: faker.number.int({ min: 0, max: 500 }),
      },
    };
  });

  // PRODUTO: só descritivo. Sem price, sem stock.
  return {
    id,
    slug,
    name,
    description: opts.description ?? faker.commerce.productDescription(),
    brand: faker.company.name(),
    categories,
    thumb_image: cdnImage(id, 0),
    images,
    tipoOpcao: escala === POR_PESO ? "peso" : "tamanho",
    items,
  };
}

// ---------- casos-limite (só no regime base; forçam bugs de layout/perf) ----------
function edgeCases() {
  return [
    // nome gigante -> testa CLS/quebra de layout no card e na PDP
    makeProduct(-1, {
      name: "Ração Super Premium Grão Especial para Cães Adultos de Raças Grandes com Fórmula Balanceada e Ingredientes Naturais Selecionados Sabor Frango e Arroz Embalagem Econômica",
      category: CATEGORIES[0],
    }),
    // máximo de SKUs -> seletor pesado na PDP
    makeProduct(-1, { name: "Kit Variado Multitamanho", category: CATEGORIES[3], nItems: 9 }),
    // muitas imagens -> galeria/PDP pesada, teste de lazy load
    makeProduct(-1, { name: "Coleção Fotográfica Completa", category: CATEGORIES[3], nImages: 15 }),
    // descrição vazia -> teste de fallback
    makeProduct(-1, { name: "Produto Sem Descrição", description: "" }),
  ];
}

// ---------- geração ----------
function generate() {
  const products = [];

  if (!VOLUME) products.push(...edgeCases());

  const restante = COUNT - products.length;
  for (let i = 0; i < restante; i++) products.push(makeProduct(i));

  return products;
}

// ---------- write ----------
const products = generate();
if (dirname(OUT) !== ".") mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(products, null, VOLUME ? 0 : 2));

// ---------- relatório ----------
const porCategoria = {};
for (const p of products) porCategoria[p.categories[0]] = (porCategoria[p.categories[0]] || 0) + 1;

console.log(`\n✓ ${products.length} produtos -> ${OUT}  (seed ${SEED}${VOLUME ? ", regime VOLUME" : ", regime base"})`);
console.log("  distribuição por categoria:");
for (const c of CATEGORIES) {
  const n = porCategoria[c.slug] || 0;
  const bar = "█".repeat(Math.round((n / products.length) * 40));
  console.log(`    ${c.slug.padEnd(18)} ${String(n).padStart(5)}  ${bar}`);
}
if (!VOLUME) console.log(`  + ${edgeCases().length} casos-limite incluídos (nome longo, 40 variantes, 15 imagens, esgotado, sem descrição)`);
const bytes = Buffer.byteLength(JSON.stringify(products));
console.log(`  tamanho: ${(bytes / 1024).toFixed(0)} KB${bytes > 500 * 1024 ? "  ⚠ grande demais para import no bundle — leia via fs/API" : ""}\n`);
