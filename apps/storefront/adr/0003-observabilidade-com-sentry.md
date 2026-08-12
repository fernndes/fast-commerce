# ADR 0003 — Observabilidade com Sentry, 100% de amostragem

- **Status:** aceito
- **Data:** 2026-08-05
- **Contexto:** `apps/storefront`

## Contexto

O storefront não tinha nenhum monitoramento de erro ou performance em
produção — falhas em rotas de API, exceptions não tratadas na árvore React e
regressões de performance só apareceriam via reclamação de usuário ou
métricas indiretas (Lighthouse CI, Vercel Speed Insights). O commit
`e7b7607 feat: add and config sentry` adicionou o SDK `@sentry/nextjs`
inteiro numa única mudança: dependência, quatro arquivos de config,
boundary de erro global e o wrapper do build.

## Decisão

### 1. Instrumentação via API nativa do Next, não `sentry.client.config.ts`

- `instrumentation.ts` (raiz) usa o hook oficial `register()` do App Router,
  carregando o config certo por runtime:

  ```ts
  export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config");
    if (process.env.NEXT_RUNTIME === "edge") await import("./sentry.edge.config");
  }
  export const onRequestError = Sentry.captureRequestError;
  ```

- `instrumentation-client.ts` é o entrypoint client — convenção atual do SDK
  que substitui o antigo `sentry.client.config.ts` de versões anteriores —
  e exporta `onRouterTransitionStart` para instrumentar navegação client-side
  do App Router.
- `sentry.server.config.ts` e `sentry.edge.config.ts` são **idênticos**
  entre si (mesmo DSN, mesmo `tracesSampleRate`), diferindo só no runtime em
  que carregam.
- `app/global-error.tsx` captura exceptions não tratadas na raiz da árvore
  React (`Sentry.captureException(error)` num `useEffect`), boundary que só
  existe desde este commit.
- `next.config.ts` envolve a config com `withSentryConfig(nextConfig, {...})`
  para upload de source maps no build (`org: "gabriel-j0"`,
  `project: "javascript-nextjs"`, `widenClientFileUpload: true`).

### 2. `tracesSampleRate: 1` — 100% das transações, sem diferenciar ambiente

Presente, idêntico, nos três arquivos de init (`instrumentation-client.ts`,
`sentry.server.config.ts`, `sentry.edge.config.ts`). Sem `tracesSampler`,
sem checagem de `NODE_ENV`, sem `beforeSend`/`beforeSendTransaction`/
`ignoreErrors` — captura tudo, sem filtro.

Esse valor já é citado como fato consumado no ADR de rate limit da raiz
(`docs/adr/0002-rate-limit-em-memoria-nas-rotas-de-api.md`): *"Um flood
satura CPU de função serverless e infla o billing — inclusive o do Sentry,
que está com `tracesSampleRate: 1`"* — ou seja, esta decisão já é tratada
como um custo conhecido, não uma surpresa a descobrir depois.

`dataCollection` aparece comentado no init client (`userInfo`,
`httpBodies`), deixando a captura de dados de usuário e corpos HTTP no
padrão do SDK (habilitado), não restringida.

### 3. DSN hardcoded, token de build em arquivo gitignored

O DSN (`https://...@o4511865256214528.ingest.us.sentry.io/4511865258770432`)
está escrito literalmente nos três arquivos de init — não é lido de env var,
e o projeto não tem `.env.example`. `SENTRY_AUTH_TOKEN` (usado só em
build-time pelo plugin de upload de source maps) fica em
`.env.sentry-build-plugin`, que foi adicionado ao `.gitignore` no mesmo
commit — não está versionado.

## Consequências

**Positivas**

- Cobertura total: erro de rota de API, exception não tratada na árvore
  React e transação de navegação client-side todos chegam ao Sentry, sem
  amostragem perdendo casos raros.
- Setup usa os hooks nativos do App Router (`instrumentation.ts`,
  `instrumentation-client.ts`) em vez de padrões legados do SDK — alinhado
  com o Next 16.
- Upload de source maps automatizado via `withSentryConfig`, então stack
  traces em produção já chegam desminificados sem passo manual.

**Negativas / limitações aceitas**

- `tracesSampleRate: 1` em produção captura 100% do tráfego de tracing —
  custo de billing cresce linearmente com o tráfego, sem teto. Combinado com
  a ausência de rate limit *antes* deste commit, foi parte do motivo que
  levou à decisão de rate limit (ADR 0002 da raiz). Não há amostragem
  reduzida planejada — risco aceito, monitorar billing do Sentry conforme o
  tráfego crescer.
- DSN hardcoded em vez de env var: trocar de projeto Sentry (ex.: ambiente
  de staging separado) exige editar código em três arquivos, não config.
- Sem `beforeSend`/filtros: ruído (erros de extensão de browser, bots,
  etc.) não é descartado antes de chegar ao Sentry — infla o volume
  reportado sem sinal adicional.
- **Incerteza não resolvida**: os commits `d6374ec test: test ci 1`
  (comenta `withSentryConfig` por completo, voltando a `export default
  nextConfig`) e `4dbc026 undo` (reverte) sugerem que o wrapper do Sentry
  causou algum problema de CI/build na época. O repo não tem hoje nenhum
  workflow de CI que referencie `SENTRY_AUTH_TOKEN` (só existe
  `.github/workflows/lighthouse-ci.yml`, que não o usa), então a causa raiz
  não é rastreável só pelo código — registrado aqui como pergunta em aberto
  em vez de uma explicação inventada.

## Alternativas descartadas

Não há evidência no histórico de commits de outras ferramentas de
observabilidade terem sido avaliadas antes do Sentry — este ADR registra a
decisão tomada, sem reconstruir um comparativo que não aconteceu no código.
