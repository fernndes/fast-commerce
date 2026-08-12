# ADR 0008 — PDP: `generateStaticParams` vazio, ISR sob demanda em vez de geração no build

- **Status:** aceito
- **Data:** 2026-08-12
- **Contexto:** `apps/storefront`

## Contexto

`app/produtos/[slug]/page.tsx` é a página de produto (PDP), servida para até
10.000 slugs distintos. `generateStaticParams` antes devolvia
`getAllProducts().map(...)` — gerar as 10.000 páginas no build. Isso deixou
de ser viável junto com a migração descrita em
[[0005-camada-de-dados-do-catalogo-leitura-via-fs]]: 10.000 páginas no build
significam minutos de compilação e um `.next` gigante para atender uma cauda
de produtos que quase ninguém acessa.

## Decisão

### 1. `generateStaticParams` devolve `[]`, de propósito

```ts
export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}
```

Nenhuma PDP é gerada no build; cada uma é renderizada e cacheada na primeira
visita (ISR sob demanda), respeitando `revalidate = 3600`. A lista vazia é
deliberada e documentada como tal porque a diferença importa: a documentação
do Next é explícita que, para renderizar todos os caminhos em runtime, a
função deve retornar `[]` — remover `generateStaticParams` completamente não
produz o mesmo comportamento.

### 2. 404 real, não uma tela de desculpas com status 200

Quando `getProductBySlug` não encontra o slug, a página chama `notFound()` —
um 404 de verdade, não um `<h1>` amigável servido com status 200. Um slug
inexistente precisa comunicar isso ao browser e a crawlers.

### 3. Imagem principal com `priority`

A primeira imagem da galeria carrega com a prop `priority` do
`next/image` — é o LCP (Largest Contentful Paint) da rota, a única imagem do
site fora do slide 0 do hero que vale a pena priorizar dessa forma.

## Consequências

**Positivas**

- Build permanece rápido e o `.next` não cresce proporcionalmente ao tamanho
  do catálogo.
- Produtos populares acabam cacheados (ISR) depois da primeira visita, sem
  pagar o custo de gerar os 10.000 no build.
- Um slug inválido produz um 404 real, correto para SEO e para crawlers.

**Negativas / limitações aceitas**

- A primeira visita a qualquer PDP paga o custo total de renderização —
  não há nenhuma página "pré-aquecida" no deploy.
- Não existe hoje nenhum mecanismo automático que promova os produtos mais
  vistos para geração no build; se isso vier a importar, o meio-termo restante
  é devolver aqui os ~50 slugs mais vistos e deixar o resto sob demanda —
  ainda não implementado.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| `getAllProducts().map(...)` no build (comportamento anterior) | 10.000 páginas geradas no build — minutos de compilação e `.next` gigante para atender uma cauda que quase ninguém acessa. |
| Remover `generateStaticParams` completamente | Não é equivalente a retornar `[]` segundo a documentação do Next — a função ausente muda o comportamento de renderização de caminhos não listados. |
| Pré-gerar os N produtos mais vistos | Não há hoje telemetria de popularidade no mock para alimentar essa lista; registrado como próximo passo, não implementado. |
