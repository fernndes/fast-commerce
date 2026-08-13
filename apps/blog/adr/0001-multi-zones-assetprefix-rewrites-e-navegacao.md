# Blog-0001 — Multi-Zones: `assetPrefix`, rewrites e `<a>` para cruzar zona

- **Status:** aceito
- **Data:** 2026-08-13
- **Contexto:** `apps/blog` (zona), `apps/storefront` (host)

## Contexto

O blog é um projeto Next **separado** do storefront, servido sob o **mesmo
domínio**. A tese é que "projeto separado" não significa "experiência separada":
o usuário atravessa storefront → blog sem perceber a fronteira de deploy.

Duas coisas colidem quando duas aplicações Next dividem um domínio:

1. As duas servem assets em `/_next/*`. Sem separação, os arquivos de uma
   sobrescrevem os da outra.
2. As duas precisam de rotas que não conflitem, e o roteamento tem que acontecer
   em algum lugar.

## Decisão

### 1. `basePath: '/blog'` + `assetPrefix: '/blog-static'` na zona

Toda rota do blog vive sob `/blog/*` e todo asset sob `/blog-static/_next/*`.
`app/page.tsx` responde em `/blog`, não em `/blog/blog` — o Next aplica o
prefixo sozinho.

O `assetPrefix` é um **caminho, não um subdomínio**. Isso não é detalhe: como os
assets acabam servidos same-origin, `script-src 'self'` da CSP já os cobre, sem
precisar autorizar origem nenhuma a mais. Um subdomínio (`static.dominio.com`)
obrigaria a abrir a CSP das duas zonas. Ver [[0004-csp-consent-e-headers-entre-zonas]].

### 2. O storefront é o host e proxeia a zona por `rewrites()`

```ts
// apps/storefront/next.config.ts
async rewrites() {
  const blog = process.env.BLOG_ZONE_URL;
  if (!blog) return [];
  return [
    { source: '/blog', destination: `${blog}/blog` },
    { source: '/blog/:path*', destination: `${blog}/blog/:path*` },
    { source: '/blog-static/:path*', destination: `${blog}/blog-static/:path*` },
  ];
}
```

`rewrites()` estático, não `proxy()`. A documentação do Next reserva `proxy()`
para decisão **dinâmica** por request (feature flag escolhendo rota, migração
parcial). Aqui o destino é fixo, então o rewrite evita o hop extra de function
por request.

Sem `BLOG_ZONE_URL` a função devolve `[]`: `/blog` cai no 404 do storefront em
vez de virar `undefined/blog`. Falha visível em vez de URL quebrada com cara de
válida — o fail-loud do ADR 0010.

O rewrite de `/blog/:path*` também cobre `/blog/_next/image`, o endpoint do
otimizador de imagens da zona. Verificado: a capa de um post é servida por
`/blog/_next/image?url=...` e resolve através do host.

### 3. `<a>` cruza zona, `<Link>` fica dentro dela

Convenção replicada nos componentes, não abstração central — mesmo espírito do
ADR 0011 do storefront.

`<Link>` faz soft navigation: o Next tenta prefetchar e trocar a rota no
cliente. Atravessar zonas é sempre **hard navigation** (documento novo,
hidratação nova), então `<Link>` apontando para outra zona falha **sem erro
visível** — é o bug silencioso da arquitetura.

A armadilha mais fina está no `href="/"`:

| Escrito | Vai para | Por quê |
| --- | --- | --- |
| `<Link href="/">` | `/blog` | O `basePath` prefixa automaticamente |
| `<a href="/">` | `/` (home do storefront) | `<a>` não recebe o prefixo |

O mesmo `href`, dois destinos. É por isso que a regra é do componente, não da
rota.

### 4. `@next/next/no-html-link-for-pages` desligada nesta zona

A regra padrão do `eslint-config-next` manda trocar `<a href="/produtos">` por
`<Link>`. Ela assume **um app só**, e sob Multi-Zones essa suposição se inverte:
`/produtos`, `/carrinho` e `/` não são rotas deste projeto. Obedecê-la produziria
exatamente a navegação quebrada descrita acima.

Desligada em `eslint.config.mjs`, com a justificativa escrita ali. O que
substitui a checagem é a convenção documentada nos componentes; com duas rotas
próprias (`/` e `/[slug]`), o custo de não ter o lint é pequeno.

### 5. Dois projetos de deploy independentes

`apps/storefront` e `apps/blog` são dois projetos na Vercel (suporte nativo a
monorepo: importa-se o repo duas vezes, cada um com seu *root directory*). Cada
um builda, versiona e faz rollback sozinho. No CI, dois jobs sem `needs` entre
eles.

| Item | Decisão | Por quê |
| --- | --- | --- |
| Domínio de produção no projeto blog | **Obrigatório**, mesmo interno | Deploy sem domínio custom é classificado como *preview* pela Vercel, que injeta `X-Robots-Tag: noindex`. Esse header vaza pela resposta que o storefront reproxeia e `/blog/*` vira não-indexável **silenciosamente**. |
| `BLOG_ZONE_URL` | Resolvida em **build time** | `rewrites()` roda durante `next build` para gerar o manifest de rotas. Trocar o domínio do blog exige **rebuildar o storefront**, não só redeployar o blog. |
| Dev local | Duas portas | `:3000` storefront, `:3001` blog, com `BLOG_ZONE_URL=http://localhost:3001`. |

## Consequências

**Positivas**

- O blog pode quebrar, ser revertido ou ter deploy travado sem tocar o
  storefront — e vice-versa. É o "blast radius" que a separação promete.
- Um push que só toca `apps/blog` não dispara rebuild do storefront.
- Assets same-origin mantêm a CSP simples nas duas zonas.

**Negativas / limitações aceitas**

- Uma camada extra de configuração de URL entre os dois projetos, que precisa de
  atenção manual sempre que o domínio do blog mudar — e que exige rebuild do
  host, não só do blog.
- Preview deployments são testados isolados por padrão. Um PR em `apps/blog`
  gera preview própria; o storefront de produção não aponta para ela. Testar a
  travessia real exige um preview do storefront com `BLOG_ZONE_URL` apontando
  manualmente para o preview do blog — reservado para QA final.
- Perdemos a checagem automática de `<a>` vs `<Link>` dentro da zona.
- Rodar o blog **fora** do host (direto na porta 3001 ou na URL de preview)
  não é equivalente a produção: a origem muda, e com ela o consent. Ver
  [[0004-csp-consent-e-headers-entre-zonas]].

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| Blog como rota dentro do storefront | Elimina a fronteira que este projeto existe para estudar, e acopla os deploys: um bug no blog derrubaria a loja. |
| `assetPrefix` em subdomínio (`static.dominio.com`) | Obrigaria a autorizar mais uma origem na CSP das duas zonas, e a cross-origin nos assets. O caminho same-origin não custa nada disso. |
| `proxy()` em vez de `rewrites()` | O destino é fixo; `proxy()` acrescentaria uma invocação de function por request para decidir o que já se sabe em build. |
| Manter `no-html-link-for-pages` e usar `<Link>` | Produz o bug que a convenção evita: soft-nav para rota inexistente nesta zona. |
