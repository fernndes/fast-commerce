# fast-commerce

**🔗 Site live:** https://fast-commerce-ten.vercel.app/

> A loja de e-commerce mais performática que eu conseguir construir —
> **incluindo tudo que uma loja real possui**, inclusive o que atrapalha a
> performance: scripts de terceiro, consent, analytics, imagens de CDN,
> catálogo grande.

## A tese

O desafio real de performance em e-commerce não é otimizar um site vazio; é
entregar velocidade máxima com tudo que o negócio, o marketing e a lei
obrigam a carregar. Este projeto não é um benchmark comparativo ("ferramenta
A vs B") nem uma demo enxuta que finge que loja real é leve — é a prova de
que dá para manter uma loja rápida com o stack completo a bordo, com cada
trade-off medido e documentado.

O número que sustenta a tese: **95-100 no PageSpeed com GTM + GA4 + Silktide
+ Microsoft Clarity a bordo** — não 100 num site vazio. A variação entre
medições é inerente ao Lighthouse (que simula CPU e rede); o teto é imposto
pelo custo de execução dos terceiros, que nenhuma estratégia de carregamento
elimina — apenas adia.

O foco é **performance de frontend**. A loja cobre os elementos que impactam
performance — catálogo, PDP, busca, carrinho, checkout (UI), banners,
consent, analytics, stack de terceiros. O que não é o ponto — pagamento
real, backend transacional, autenticação de verdade — é mockado no front: a
UI existe e é medida; a lógica de servidor é simulada.

## Estrutura do monorepo

```
fast-commerce/
├─ apps/
│  ├─ storefront/     # Loja (Next.js) — host do domínio, produtos/categorias/busca
│  └─ blog/            # Zona editorial (Next.js) — servida via Multi-Zones sob /blog
├─ packages/
│  ├─ nav/              # Dados/geração de categorias de navegação
│  ├─ ui/                # Design tokens, brand, primitivos de UI (React)
│  └─ ui-patterns/      # AppHeader / AppFooter compartilhados entre as zonas
├─ docs/adr/             # ADRs históricos do início do projeto (casca em web components)
└─ apps/*/adr/           # ADRs vigentes de cada app (decisão → consequência → alternativas)
```

Workspaces via `npm`; cada app builda e faz deploy de forma independente
(dois projetos Vercel), ligados apenas pela URL de rewrite entre zonas.

### `apps/storefront` — a loja

Next.js 16 / React 19. Rotas principais: `/produtos`, `/produtos/[slug]`,
`/categorias/[slug]`, `/busca`, além de rotas de API finas (`/api/produtos`,
`/api/busca`) sobre uma camada de dados que lê o catálogo (`data/big.json`)
via `fs`, memoizada por processo. É o **host** do domínio: além de servir a
loja, faz o proxy (`rewrites`) de `/blog` e `/blog-static` para o deploy do
blog.

### `apps/blog` — zona editorial (Next.js Multi-Zones)

Projeto Next.js separado, com build e deploy próprios, servido sob o mesmo
domínio via **Multi-Zones** (`basePath: /blog`, `assetPrefix:
/blog-static`). 10.000 posts gerados uma única vez em build time por
`@faker-js/faker` (seed fixa, determinístico), lidos em runtime via `fs` —
faker nunca entra no bundle de produção. A listagem não pagina nem faz
scroll infinito: usa **windowing puro** (`@tanstack/react-virtual`) sobre um
índice estático único (`posts-index.json`), com a primeira janela
renderizada no HTML para LCP/SEO e um `sitemap.xml` com os 10 mil slugs para
crawlers. CSP, security headers, consent e container GTM são replicados
origem-por-origem em relação ao storefront — as duas zonas compartilham
origem, então consent e cookies atravessam sem exibir o banner duas vezes.

### `packages/`

- **`@repo/nav`** — geração dos dados de categoria/navegação usados pelo mega
  menu.
- **`@repo/ui`** — tokens de design (Tailwind), marca, ícones e primitivos.
- **`@repo/ui-patterns`** — `AppHeader`/`AppFooter` como Server Components
  React, publicados como TSX cru (sem step de build próprio — cada app os
  transpila no seu próprio grafo via `transpilePackages`, o que preserva a
  fronteira server/client).

## Stack técnico

- **Next.js 16** (App Router) + **React 19**, TypeScript
- **Tailwind CSS v4**, sem CSS-in-JS de runtime
- `@tanstack/react-virtual` (windowing da listagem do blog)
- `@next/third-parties` (Google Tag Manager)
- `@sentry/nextjs` (observabilidade / erros — storefront)
- `@vercel/speed-insights` (RUM — Core Web Vitals de campo, nas duas zonas)
- `@faker-js/faker` (devDependency — geração de conteúdo do blog em build
  time)
- Lighthouse CI (`@lhci/cli`) com budget travado no pipeline

## Como rodar localmente

Requer Node 22+ (CI usa Node 22 para o storefront e Node 24 para o blog, que
roda `.ts` nativamente sem passo de transpilação).

```bash
npm install

# sobe as duas zonas (storefront :3000, blog :3001)
npm run dev

# só uma zona
npm run dev --workspace=fast-commerce   # storefront
npm run dev --workspace=blog            # blog
```

Para navegar entre zonas localmente como em produção, aponte
`BLOG_ZONE_URL=http://localhost:3001` no `.env.local` do storefront — sem
essa variável o rewrite `/blog` não é montado.

```bash
npm run build   # build --workspaces (nav primeiro, os outros dependem dele)
npm run lint
```

---

## Renderização: a matriz de decisão por rota

A estratégia de renderização não foi decidida rota a rota por intuição. Três
eixos, respondidos nessa ordem, produzem a escolha:

**Cardinalidade** — quantas variações distintas desta rota existem? Poucas e
conhecidas no build, ou muitas/ilimitadas?

**Tolerância à defasagem** — o conteúdo pode estar alguns minutos
desatualizado? Este eixo tem **poder de veto**: se não tolera, é dinâmico,
independentemente dos outros dois.

**Conjunto aberto ou fechado** — novos slugs surgem depois do build?

| Rota | Cardinalidade | Defasagem | Conjunto | Estratégia |
|---|---|---|---|---|
| `/` | Baixa | Tolera | Fechado | SSG/ISR |
| `/produtos` | Alta (filtros) | Tolera | — | Dinâmico (`searchParams`) |
| `/produtos/[slug]` | Alta (10k slugs) | Tolera | Aberto | ISR sob demanda |
| `/categorias/[slug]` | Baixa (~30) | Tolera | Fechado | ISR pré-gerado |
| `/busca` | Alta (query livre) | Tolera | — | Dinâmico (`searchParams`) |

A PDP usa `generateStaticParams: []` com `revalidate: 3600`: nenhuma rota é
pré-gerada no build (gerar 10.000 páginas seria minutos de compilação para
atender uma cauda que quase ninguém acessa), e cada slug nasce sob demanda na
primeira visita, cacheado dali em diante. `dynamicParams` é `true` por
padrão, o que torna a lista vazia uma decisão coerente e não um bug.

`/produtos` e `/busca` não declaram `force-dynamic` — tornam-se dinâmicas por
ler `searchParams`, e o Next infere isso. `force-dynamic` aparece apenas nas
rotas de API, onde é declaração de intenção.

## Camada de dados: por que não há banco

`data/big.json` — 10.000 produtos, 29.112 SKUs, 13 MB — é lido via `fs` (nunca
`import`, que colocaria os 13 MB no bundle) dentro de uma promise memoizada
por processo em `lib/catalog.ts`. Índices em `Map` (`bySlug`, `byDept`,
`bySub`) são construídos uma vez e reutilizados.

O slug é a identidade — não o `id`, porque o dataset mock tem ids duplicados.
Essa escolha aparece em `generateStaticParams`, nas rotas e nos índices.

Server Components leem `lib/` diretamente, sem hop de rede. As rotas de API
existem apenas onde há consumidor real no browser: `/api/produtos` (windowing
client-side) e `/api/busca/sugestoes` (autocomplete). Uma página que chamasse
a própria API por HTTP pagaria latência de rede para acessar dados que já
estão no mesmo processo.

## Performance: budget, medição e o que o número significa

Lighthouse CI roda em todo push/PR (`.github/workflows/lighthouse-ci.yml`),
como **dois jobs independentes** — um por zona, sem `needs` entre eles, para
que uma quebra não derrube a outra. Budget travado (`error`, não `warn`):

| Métrica | Limite |
|---|---|
| Performance score | ≥ 0.95 |
| LCP | ≤ 2500 ms |
| CLS | ≤ 0.1 |
| TBT | ≤ 200 ms |

`numberOfRuns: 3` — o Lighthouse tem variância entre execuções; medir uma vez
e confiar é erro de método. As asserções em `error` (não `warn`) são o que dá
dente ao budget: com `warn` o build passa e o aviso é ignorado.

RUM de campo via Vercel Speed Insights nas duas zonas, para contrastar o
número de lab (Lighthouse, condições simuladas) com a experiência real de
usuário (redes e dispositivos reais).

### Hero: o único `preload` da página

No Next 16, `priority` foi depreciado em favor de `preload`. O slide 0 do hero
recebe `preload: true`; todos os demais recebem `loading="lazy"`. A regra é
binária e sem exceção — `preload` e `loading="lazy"` no mesmo `<Image>` lança
erro em runtime.

Os dois erros opostos que essa regra evita: `loading="lazy"` no slide 0 faz o
browser adiar deliberadamente o download da imagem mais importante da página
(bug encontrado na prática em `/produtos`); `preload` em todos os slides
divide a banda entre banners que o usuário ainda não viu.

O hero é Server Component puro. A rotação automática (`CarouselAutoplay`) é
uma **ilha irmã** — Client Component que encontra o carrossel por `id` e age
sobre ele, sem envolvê-lo. Se o autoplay envolvesse os slides como `children`,
o conteúdo iria para o payload RSC em vez do HTML: existiria no documento como
JSON serializado, não como HTML diretamente pintável, prejudicando o LCP.

`aspect-ratio` fixo no container reserva o espaço antes do primeiro byte de
imagem — CLS zero na área do hero.

### Mega menu: quando o padrão recomendado é a escolha errada

O padrão comumente recomendado para menus com estado é um Client Component
gerenciando `aberto/fechado`, com o conteúdo passado como `children` de um
Server Component. **Esse padrão foi testado e rejeitado**, e o motivo é o
achado técnico mais instrutivo do projeto:

`{aberto && <div>{children}</div>}` com `aberto` iniciando `false` significa
que o painel **não existe no HTML servido** — o conteúdo vai para o payload
RSC, não para o documento. Os `<a href>` das subcategorias deixam de ser
rastreáveis. O padrão usa o argumento de SEO para justificar a arquitetura que
destrói esse SEO.

A solução: painel **presente-mas-oculto** com `invisible`, aberto por
`group-hover` / `group-focus-within` do Tailwind. Zero JavaScript, e o
resultado é verificável no HTML prerenderizado: **70 links de categoria, 32
slugs distintos, todos como `<a href>` reais**. Header completo: 19.8 KB
brutos / 2.0 KB gzip.

Detalhes que fecham os casos de borda: o gatilho é `<Link href="/categorias">`
e não `<button>` — em touch, tocar navega para a listagem completa (degradação
correta, zero botões mortos no HTML); o Tailwind envolve `hover:` em
`@media (hover: hover)`, então touch não dispara o painel por acidente;
`invisible` mantém os links no tab order, então navegação por teclado funciona
sem JavaScript.

A única ilha client do header é `close-on-navigate.tsx` — ~10 linhas que
renderizam `null`. Existe porque numa transição client-side o header persiste
e o `<details>` do menu mobile continuaria aberto sobre a página nova: o único
comportamento que CSS genuinamente não resolve.

`prefetch={false}` no painel (30 links × toda página = 30 requests de rotas
improváveis por carregamento), `prefetch` ativo nos 6 destaques de alta
intenção.

---

## Stack de terceiros: inventário e orquestração

| Terceiro | Propósito | Entrega | Gate de consent |
|---|---|---|---|
| GTM | Orquestrador de tags | `@next/third-parties` no layout | Incondicional |
| GA4 | Analytics de produto | Tag do Google dentro do GTM | Consent Mode v2 (`analytics_storage`) |
| Silktide | Banner GDPR/LGPD | Custom HTML no GTM, self-hosted em `/consent/` | É o mecanismo |
| Microsoft Clarity | Heatmaps / session replay | Propriedade `scripts` do Silktide | `analytics_storage` aceito |
| Speed Insights | RUM de Web Vitals | `<SpeedInsights />` no layout | Não coleta PII |

O GTM é o ponto de entrada do ecossistema Google e do consent — **não** um
intermediário universal. Clarity não passa pelo GTM; Speed Insights também
não. A separação reflete responsabilidades: GTM gerencia o que o marketing
configura sem deploy; Silktide controla o gate determinístico de terceiros
não-Google; Speed Insights é infraestrutura.

### Por que o Clarity não está no GTM

Três tentativas, e o diagnóstico por eliminação vale mais que a solução:

**Tentativa 1 — Custom HTML no GTM com "exigir consentimento adicional".** O
Tag Assistant mostrou a tag **disparando com `analytics_storage: denied`**. O
mecanismo de consent do GTM é aplicado de forma confiável em tags nativas
(que implementam Consent Mode), mas não em HTML customizado arbitrário — o
GTM injeta o script e a checagem não impede a execução de forma determinística.

Diferente do GA4, que degrada para modo cookieless quando negado, o Clarity
não tem Consent Mode nativo: se dispara, grava. Session replay sem
consentimento é violação séria, não detalhe.

**Tentativa 2 — template oficial da Microsoft.** Reportou "Falhou" no Tag
Assistant. Causa: CSP bloqueando `scripts.clarity.ms`.

**Solução — propriedade `scripts` do Silktide.** O Silktide injeta o script
apenas quando o tipo `analytics` é aceito, e **recarrega a página na
revogação** para garantir teardown limpo. Não há nada para "bloquear depois":
a tag simplesmente não é criada antes do aceite.

```js
{
  id: "analytics",
  gtag: "analytics_storage",
  scripts: [{ url: "https://www.clarity.ms/tag/<id>", load: "async" }],
  onAccept: function() {
    window.clarity = window.clarity || function() {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };
  }
}
```

O `scripts` cria a tag `<script>`; o `onAccept` inicializa o stub que enfileira
chamadas feitas antes do script assíncrono chegar.

### O Clarity carrega em dois estágios

Descoberta feita em produção: `www.clarity.ms/tag/<id>` é apenas o **loader**,
que por sua vez carrega `scripts.clarity.ms/<versão>/clarity.js` — subdomínio
diferente. A CSP permitia o primeiro e bloqueava o segundo, então o loader
executava com sucesso e o Clarity nunca gravava nada.

A lição generaliza: script de terceiro que carrega outro script exige que a
CSP cubra a **cadeia inteira**, não só o primeiro elo. Daí o wildcard
`https://*.clarity.ms` em `script-src` e `connect-src`.

### Estratégia de carregamento e o teto irredutível

`<GoogleTagManager>` usa `afterInteractive` — carrega após a hidratação, sem
bloquear LCP. Isso significa que o banner de consent, o GA4 e (por tabela) o
Clarity aparecem alguns instantes após a hidratação, não no primeiro paint.
Trade-off aceito: bloquear a hidratação para exibir o banner mais cedo trocaria
LCP por conformidade aparente; a conformidade real é que nada coleta antes da
escolha.

**`lazyOnload` foi avaliado e descartado.** Adiaria o GTM — e com ele o
Silktide — para depois da interação do usuário, o que compromete GDPR/LGPD: o
consent deve ser oferecido antes da interação, não durante. O custo de TBT é
adiado, nunca eliminado.

**Partytown foi descartado.** Mover o GTM para um web worker levaria o Silktide
junto, e o Silktide precisa de acesso síncrono ao DOM (renderiza o banner,
captura cliques, escreve no `localStorage`) — incompatível com o modelo de
proxy assíncrono do Partytown. Confirmado que quebrava o banner em teste.

O que é controlável: estratégia de carregamento, quantidade e peso das tags.
O que é teto imposto: o custo de execução dos quatro terceiros uma vez a
bordo. O TBT mínimo com esse stack **é** esse custo — e 95-100 é o número
com ele pago.

---

## Segurança

### CSP: por origem, sem nonce, sem SRI

A política enforcing autoriza por **origem**, não por nonce nem hash. As duas
alternativas foram avaliadas e descartadas por razões diferentes — e uma delas
por diagnóstico de falha em produção:

**Nonce foi descartado por custo arquitetural.** Gerar nonce por request exige
`proxy.ts` rodando em toda requisição e leitura de `headers()` no layout — o
que força **renderização dinâmica em todas as rotas**, destruindo o estático e
o ISR que são a tese de performance do projeto. Nonce compra proteção contra
inline injection ao preço da estratégia de renderização inteira.

**SRI (`experimental.sri`) foi descartado após quebrar o consent em produção.**
Com o SRI ativo, o banner do Silktide parou de aparecer. O diagnóstico por
eliminação (remover SRI e CSP separadamente) isolou o SRI como causa. A razão
pela qual isso foi difícil de detectar merece registro: **SRI não tem modo
report** — ao contrário da CSP, que oferece `Report-Only`, o SRI bloqueia
sempre que a verificação falha, silenciosamente do ponto de vista da página.
A política estava em `Report-Only` (que não bloqueia nada por definição) e
ainda assim o consent quebrou, porque o SRI estava em enforcing o tempo todo.

SRI é, além disso, estruturalmente inaplicável a terceiros dinâmicos: o hash
fixo de um `gtm.js` que o Google atualiza continuamente quebraria a cada
mudança.

**`'unsafe-inline'` em `script-src` é concessão obrigatória desta estratégia**,
não descuido. Sem nonce nem hash, negar inline quebraria o próprio Next — que
injeta `self.__next_f` (payload RSC) em toda página — além das Custom HTML
tags do GTM. A lacuna é reconhecida e mitigada: o React escapa interpolações
por padrão (não há `dangerouslySetInnerHTML` com input de usuário no projeto),
e `connect-src` restrito limita exfiltração mesmo se um inline malicioso
executar.

O que a política **ainda** garante, e que nonce/SRI não cobrem:

- `script-src` por origem bloqueia `<script src="evil.com">` — o vetor XSS
  mais comum
- `object-src 'none'` mata `<object>`/`<embed>`
- `frame-ancestors 'none'` — anti-clickjacking
- `base-uri 'self'` — bloqueia hijack de URLs relativas via `<base>`
- `form-action 'self'` — formulários só submetem ao próprio domínio
- `connect-src` restrito — mesmo script malicioso executando só "liga" para
  domínios listados; exfiltração contida

O processo de rollout: `Content-Security-Policy-Report-Only` → exercitar
todos os fluxos condicionais (incluindo **aceitar e recusar consent em sessões
limpas**, onde GA4 e Clarity de fato executam) → tratar cada violação →
enforcing. Testar só navegação passiva produziria console limpo e enforcing
quebrado em produção.

Resultado verificado: **nota A no securityheaders.com**.

### Rate limiting: as restrições do Next 16 que moldaram o desenho

`lib/rate-limit.ts` — janela deslizante (sliding window log), 100 req/min por
IP, contador em memória de processo. Três restrições verificadas nos docs do
Next 16.2.12 determinaram o desenho:

**`middleware.ts` virou `proxy.ts`, e os docs desaconselham globals nele** —
"should not attempt relying on shared modules or globals", exatamente o que um
contador em memória precisa. A checagem ficou nos route handlers.

**`NextRequest.ip` e `.geo` foram removidos no v15** — o IP sai de
`x-forwarded-for` (leftmost) → `x-real-ip` → `'unknown'`. O leftmost só é
confiável porque a Vercel reescreve o header; sem proxy confiável na frente,
ele é forjável. Essa premissa está documentada no docblock, porque toda a
eficácia depende dela.

**Route handlers não compartilham dados entre instâncias** — daí a limitação
aceita: sob escala horizontal o teto efetivo é `N × 100/min`, não 100/min
global. Atenua abuso concentrado; não é limite auditável.

Janela deslizante e não fixa de propósito: com janela por minuto de relógio,
100 requests em `:59` e mais 100 em `:00` passariam — 200 em dois segundos.

Contenção de memória: sweep preguiçoso (sem `setInterval`, que manteria o
processo vivo e não sobrevive a lambda) e backstop em `MAX_KEYS: 10.000`
limpando o Map inteiro. O backstop é **fail-open** por escolha: sob flood
distribuído de IPs distintos, prefere-se perder um minuto de contagem a
crescer sem teto. Isso significa que este mecanismo protege contra abuso de
origem única, **não** contra DDoS distribuído — para o qual a mitigação
automática da Vercel (gratuita em todos os planos) é a camada correta. Rate
limiting configurável no edge (WAF) é recurso de plano pago, indisponível no
Hobby.

A assinatura é `async` mesmo sendo síncrona por dentro — é o que torna a troca
por Upstash/Vercel KV um drop-in sem tocar em nenhum handler.

Headers IETF `RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset` em
todas as respostas (não só no 429), para que um cliente bem-comportado veja o
orçamento antes de bater no teto.

O valor 100/min é **provisório** — ponto de partida generoso que não bloqueia
usuário legítimo (o debounce de 200ms do autocomplete mantém o volume real
muito abaixo) e barra abuso óbvio. O número fundamentado depende do ponto de
ruptura real, que o baseline de k6 revelará.

### Sanitização de input

`sanitizeSearchTerm` em `lib/query.ts` remove caracteres de controle Unicode
(categorias Cc/Cf), colapsa espaços e limita o comprimento. Aplicada em duas
camadas independentes — na borda da rota de API e internamente na lib —
porque a rota é superfície pública alcançável sem passar pelo frontend.

O modelo de ameaça é custo algorítmico e caracteres de controle em UI/logs,
não injeção de regex nem XSS (que o React já escapa). Query vazia ou de uma
letra retorna lista vazia com 200, não 400: digitar a primeira letra é estado
normal de autocomplete, não erro do cliente.

## Observabilidade

Sentry com **error tracking + tracing + logs**. Três escolhas de instalação
que valem registro:

**Session Replay: não.** Adiciona peso significativo ao bundle client, e o
Clarity já cobre comportamento visual — dois SDKs medindo a mesma dimensão,
pagando bundle duas vezes.

**Tunneling (rotear eventos pelo próprio servidor para driblar ad blockers):
não.** Cada evento viraria uma invocação serverless a mais, contra a tese de
escala do projeto. O trade-off — perder dados de usuários com ad blocker — é
aceitável num projeto de portfólio.

**Tracing: sim, com sample rate baixo.** No Next.js, o SDK instrumenta browser
e server na mesma instalação (não são dois esforços separados como seria com
frontend e API desacoplados). O valor aparece sob carga, quando o k6 revelar
onde o tempo evapora na cadeia.

Source maps enviados no build via `withSentryConfig` (`SENTRY_AUTH_TOKEN` em
variável de ambiente, nunca commitado) — sem eles, stack traces de produção
vêm minificados e inúteis. O DSN é hardcoded por design: ele fica no bundle
client de qualquer forma, é identificador público, e o único abuso possível é
enviar eventos falsos.

As três dimensões de observabilidade são complementares, não redundantes:
Speed Insights responde "está rápido para usuários reais"; Sentry responde "o
que quebrou e onde"; GA4 responde "quantos e o quê"; Clarity responde "como
navegaram".

## Decisões de arquitetura (ADRs)

Cada decisão não óbvia está registrada em `apps/storefront/adr/` e
`apps/blog/adr/`, no formato contexto → decisão → consequências → alternativas
descartadas, com wikilinks entre ADRs relacionados.

Os ADRs mais densos são os que documentam **rejeições**, não adoções: por que
o padrão `children`-de-Client-Component é errado para navegação em header, por
que o SRI experimental quebrou a cadeia de consent, por que nonce custaria a
renderização estática, por que Partytown é incompatível com um CMP.

## Roadmap

O projeto se organiza em um **núcleo obrigatório** — que constrói a loja
completa e prova sua performance do laboratório ao campo — e uma **trilha
opcional**, que estende o projeto depois do núcleo fechado.

| Fase | Trilha | Tese |
|---|---|---|
| 1 — Storefront & Otimização em Lab | Núcleo | Performance como engenharia mensurável, com CI e budget travado |
| 2 — Loja Real Completa & seus Trade-offs | Núcleo | Loja rápida com todo o stack que uma loja real carrega (terceiros, consent, catálogo grande) |
| 3 — Performance de Campo (RUM) | Núcleo | Confirmar em campo o que foi otimizado em lab, sob condições adversas |
| Blog em Multi-Zones | Núcleo (extensão) | Windowing puro em 10k posts, zona separada sem costura de UX/CSP/consent |
| 5 — Escala, Resiliência, Observabilidade & Segurança | Núcleo (extensão) | Escalar sem banco de dados: índice pré-computado, cache de edge, teste de carga (k6), CSP, rate limiting |
| O1 — Backend & API própria | Opcional | API NestJS + GraphQL/REST sobre PostgreSQL, substituindo a camada `lib/` sem tocar nas páginas |
| O2 — Parceiros hostis & resiliência | Opcional | Sincronização resiliente (filas, idempotência, anticorruption layer) contra parceiros simulando falhas reais |
| O3 — Extensão Chrome de cenários adversos | Opcional / satélite | Throttling real via `chrome.debugger`/CDP, projeto autônomo pós-núcleo |

Regra de foco: nada da trilha opcional entra antes do núcleo estar
concluído — as opcionais são enriquecimento, nunca pré-requisito.

### Em aberto

- **Baseline de carga (k6)** — seis cenários, com ênfase em variar parâmetros:
  home (controle), `/produtos?page=1` repetido vs `?page=N` variado,
  `/produtos/[slug]` com slugs variados (candidato a ruptura, por ser ISR sob
  demanda), `/busca?q=` variado (pior caso não-cacheável). Repetir o mesmo
  parâmetro mede o cache, não a aplicação.
- **Recalibrar o rate limit** a partir do ponto de ruptura medido.
- **Migrar imagens do hero** de `dummyimage.com` para asset próprio — o
  otimizador do Next busca a imagem de origem externa antes de servir,
  somando latência de rede ao caminho do LCP.
- **Medir o impacto do Clarity no TBT** — session replay contínuo é mais
  pesado que um beacon de analytics.

## Trilha de escrita

Cada fase fechada e cada mini-case (problema → decisão → antes/depois) vira
um artigo curto, com base nos ADRs e nas métricas capturadas.