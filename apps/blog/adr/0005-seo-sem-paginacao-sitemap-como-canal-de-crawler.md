# Blog-0005 — SEO sem paginação: o sitemap como canal de crawler

- **Status:** aceito
- **Data:** 2026-08-13
- **Contexto:** `apps/blog` — `app/sitemap.ts`, `app/robots.ts`, `lib/site.ts`

## Contexto

A decisão de [[0002-windowing-puro-sobre-indice-estatico-unico]] abriu mão de
paginação. Isso tem um custo direto e conhecido: **sem URLs de página, um crawler
não alcança o post nº 5.000 seguindo links da listagem.** A primeira janela expõe
24 `<a href>` no HTML; o resto só existe depois que JavaScript roda e o
virtualizador materializa as linhas.

Esse custo precisa ser pago explicitamente, não ignorado.

## Decisão

### 1. A divisão de responsabilidades

> A listagem é para **humanos**. O `sitemap.xml` é para **crawlers**.

Cada `/blog/[slug]` é uma página real com URL canônica própria. O
`app/sitemap.ts` declara os 10.000 slugs de uma vez, gerado no build a partir do
mesmo `posts.json`. O Google chega aos posts pelo sitemap, não pela listagem.

Verificado: `/blog/sitemap.xml` responde `application/xml` com **10.001 `<loc>`**
(a listagem + os 10.000 posts).

### 2. `lastModified` é a data de publicação, não `new Date()`

O conteúdo é imutável. Mandar `new Date()` faria o crawler revisitar 10.000
páginas que não mudaram — desperdício do crawl budget dele e nosso.
`changeFrequency: 'yearly'` pela mesma razão.

### 3. URLs sempre no domínio público, nunca no domínio do deploy

`lib/site.ts` centraliza isso. A zona blog tem uma URL de deploy própria
(`blog-xxx.vercel.app`), mas **nenhuma URL canônica, nenhuma entrada de sitemap e
nenhum `og:url` pode apontar para lá**. Para o Google o blog vive em
`dominio.com/blog/*`.

Anunciar a URL do deploy criaria duas URLs indexáveis para o mesmo conteúdo — o
conteúdo duplicado que este ADR existe para evitar. `metadataBase` no layout
resolve as canônicas relativas contra esse mesmo domínio.

Nota: o valor padrão é o mesmo domínio que o container do GTM usa para servir os
scripts do Silktide. Não é coincidência e não pode divergir — ver
[[0004-csp-consent-e-headers-entre-zonas]].

### 4. Canonical por post, e nenhum `?page=`

Cada post declara `alternates.canonical`, mais OpenGraph (`type: 'article'`,
`publishedTime`, `authors`, imagem 1200×630). Como paginação não existe em lugar
nenhum do projeto, a classe de conteúdo duplicado que ela cria também não existe
— o cuidado do ADR 0011 sai de graça aqui.

Verificado no HTML de um post: `<link rel="canonical">` com o domínio público e
`og:type=article`.

### 5. `<noscript>` e o link visível para o sitemap

A listagem traz um `<noscript>` explicando que aquela é a primeira janela e
apontando para o índice completo. O footer traz o mesmo link, **visível**: é a
única rota pela qual um leitor sem JS alcança o post nº 5.000. Se a virtualização
falhar por erro de rede, a ilha mostra o mesmo caminho em vez de uma tela que
parece ter só 24 posts — fail-loud, no espírito do ADR 0010.

## Consequências

**Positivas**

- Os 10.000 posts são descobríveis por crawler apesar de não haver paginação.
- Zero conteúdo duplicado: uma URL canônica por post, nenhum `?page=`.
- Sitemap e canônicas gerados no build, sem invocação por request.
- Quem chega sem JS tem um caminho declarado para o conteúdo completo.

**Negativas / limitações aceitas**

- **Crawlers leem `dominio.com/robots.txt` — a raiz — e essa rota pertence ao
  storefront.** O `robots.txt` que o Google efetivamente obedece é o do host; o
  desta zona só responde no caminho prefixado. Para o Google descobrir o sitemap
  do blog sozinho, **o `robots.txt` do host precisa referenciá-lo** — pendência
  registrada, ainda não feita. Enquanto isso, o caminho confiável é submeter
  `/blog/sitemap.xml` direto no Search Console.
- Descoberta por link interno é limitada aos 24 posts da primeira janela: não há
  ligação entre posts (nem "relacionados", nem por tag), então o grafo interno do
  blog é raso.
- Um sitemap de 10.000 URLs cabe no limite de 50.000, mas não há margem para
  crescer muito antes de precisar de `generateSitemaps` particionado.
- A descoberta depende inteiramente do sitemap ser lido. Se ele quebrar, 9.976
  posts ficam invisíveis para busca — e nada no CI verifica isso hoje além da
  geração não falhar.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| Paginação com `?page=` | Resolveria a descoberta, mas é exatamente a técnica que o projeto existe para não usar. Traz de volta conteúdo duplicado e estado de URL. |
| Renderizar os 10.000 `<a>` no HTML (escondidos) | DOM gigante e TBT alto para servir crawler — desfaz o windowing que a listagem existe para provar. |
| Confiar que o Google executa JS | Ele executa, mas com orçamento e atraso próprios. Apostar a descoberta de 10.000 páginas nisso é imprudente quando o sitemap resolve de forma determinística. |
| `robots.txt` só no host | É o que efetivamente vale; o desta zona existe para declarar o sitemap no caminho prefixado. As duas coisas não se excluem — falta a referência no host. |
