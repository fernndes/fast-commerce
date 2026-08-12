# ADR 0002 — CSP por autorização de origem, sem nonce nem SRI

- **Status:** aceito
- **Data:** 2026-08-11
- **Contexto:** `apps/storefront`

## Contexto

O site carrega scripts de terceiros necessários ao negócio — GTM, e via GTM
o Silktide Consent Manager e o Microsoft Clarity (ver
[[0001-consentimento-de-cookies-silktide-via-gtm]]) — e precisa de uma
Content-Security-Policy que reduza a superfície de XSS sem quebrar essa
cadeia. As duas estratégias mais rígidas de CSP (nonce e Subresource
Integrity) foram tentadas e descartadas na prática, não só na teoria — o
histórico de commits mostra um diagnóstico por eliminação real.

## Decisão

Toda a configuração vive num único arquivo, `next.config.ts`, na função
`headers()`. Não existe `middleware.ts` nem `proxy.ts` no projeto — só
`next.config.ts`. Isso é consistente com a decisão já tomada no rate limit
(ADR 0002 da raiz, `docs/adr/0002-rate-limit-em-memoria-nas-rotas-de-api.md`):
o Next 16 desaconselha módulos/globals compartilhados em `proxy.ts`.

### 1. Autorização por origem, não nonce, não SRI

```
script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://*.clarity.ms;
```

- **Nonce descartado**: exigiria renderização dinâmica em toda rota (o nonce
  muda por request), o que quebraria o modelo estático/ISR que é a base de
  performance do projeto.
- **SRI (`experimental.sri.algorithm: 'sha256'`) tentado e revertido**: SRI
  não tem modo report — qualquer script sem hash correto é bloqueado sempre.
  Como o GTM injeta o Custom HTML de init do Silktide *inline* e sem hash
  fixo, SRI quebrava essa cadeia **silenciosamente** (a página continuava
  funcionando, só o consent manager não inicializava).
- **`'unsafe-inline'` em `script-src` é concessão obrigatória** desta
  estratégia: o próprio Next injeta scripts inline (payload RSC,
  `self.__next_f`) e o GTM injeta o Custom HTML do Silktide inline. Negar
  inline sem nonce/hash quebraria a hidratação do framework inteiro.

### 2. O diagnóstico por eliminação (histórico de commits)

A sequência de commits abaixo, todos em `next.config.ts` (e um em
`app/layout.tsx`), documenta como o time chegou na config final:

1. **9d1bd88** `chore: implement CSP` — introduz CSP em modo **Report-Only**,
   `experimental.sri.algorithm: 'sha256'` habilitado, `script-src` sem
   `'unsafe-inline'`. Move `<GoogleTagManager>` para dentro de `<body>`.
2. **d227ef6** `test: test disable experimental config` — remove o header
   CSP inteiro e comenta o SRI, isolando a variável para diagnóstico.
3. **3559cc9** `test: test enable only SRI` — reativa só `experimental.sri`,
   sem CSP, para testar SRI isoladamente.
4. **0302fe7** `test: test enable only CSPRO` — desativa SRI de novo,
   reativa só o CSP Report-Only, para testar CSP isoladamente. Esse par
   (3559cc9 + 0302fe7) é o experimento que provou que era o **SRI**, não o
   CSP, quebrando a cadeia GTM → Custom HTML → Silktide.
5. **7ccd4db** `chore: config CSP` — chega na estratégia final: remove de
   vez o `experimental.sri`, adiciona `'unsafe-inline'` a `script-src`,
   troca para wildcards (`*.googletagmanager.com`, `*.google-analytics.com`)
   em `img-src`/`connect-src`, muda `X-Frame-Options` para `DENY`. Ainda em
   Report-Only.
6. **440edb2** `chore: config CSP` — troca a chave do header de
   `Content-Security-Policy-Report-Only` para `Content-Security-Policy`
   (enforcing) — é aqui que a política passa a bloquear de fato.
7. **ad53a66** / **1b6fb68** — adicionam `https://*.clarity.ms` a
   `script-src` e `connect-src` (Microsoft Clarity, entregue via GTM).

### 3. Diretivas atuais e por quê

| Diretiva | Valor | Razão |
| --- | --- | --- |
| `default-src` | `'self'` | Fallback restritivo. |
| `script-src` | `'self' 'unsafe-inline'` + `googletagmanager.com` + `*.clarity.ms` (+ `'unsafe-eval'` e `va.vercel-scripts.com` só em dev) | GTM bootstrap; Clarity via Custom HTML do GTM; `'unsafe-inline'` para o payload RSC do Next e o init inline do Silktide; Vercel Speed Insights só em dev. |
| `style-src` | `'self' 'unsafe-inline'` | Estilos inline do Next/Tailwind. |
| `img-src` | `'self' blob: data:` + `dummyimage.com` + `*.googletagmanager.com` + `*.google-analytics.com` | `dummyimage.com` é o placeholder de imagem de produto (`images.remotePatterns`); os demais são pixels/beacons de GTM/GA4. |
| `connect-src` | `'self'` + `*.google-analytics.com` + `*.analytics.google.com` + `*.googletagmanager.com` + `*.clarity.ms` | XHR/beacon do GA4 e do Clarity. |
| `object-src` | `'none'` | Mata `<object>`/`<embed>`. |
| `base-uri` | `'self'` | Anti hijack de `<base>`. |
| `form-action` | `'self'` | Formulários só submetem ao próprio domínio. |
| `frame-ancestors` | `'none'` | Anti-clickjacking, consistente com `X-Frame-Options: DENY`. |

Junto ao CSP, `securityHeaders` aplica a `/:path*`: HSTS (2 anos +
preload), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
desabilitando câmera/microfone/geolocalização.

### 4. Lacuna observada, não resolvida

Nenhuma diretiva cobre `ingest.us.sentry.io`, o endpoint para onde o SDK
`@sentry/nextjs` reporta erros e traces (ver
[[0003-observabilidade-com-sentry]]). Captura de erro client-side
(`instrumentation-client.ts`) faria requests do browser para esse domínio.
Isso não bloqueou nada visivelmente até agora — não está confirmado se é uma
lacuna real (talvez o report saia majoritariamente do runtime Node/edge,
sem passar pelo `connect-src` do browser) ou um item que passou batido.
Registrado aqui para validação futura, não como bug confirmado.

## Consequências

**Positivas**

- Cobre o vetor de XSS mais comum (`<script src="evil.com">`) sem exigir
  renderização dinâmica em nenhuma rota — compatível com o modelo
  estático/ISR do projeto.
- `connect-src` restrito contém exfiltração mesmo se um inline malicioso
  conseguir executar: só pode "ligar" para os domínios listados.
- O comentário de rationale no próprio `next.config.ts` documenta o
  raciocínio para quem for mexer na política depois, incluindo o fluxo
  recomendado (Report-Only → validar todas as rotas e os dois estados de
  consent → trocar para enforcing).

**Negativas / limitações aceitas**

- `'unsafe-inline'` em `script-src` é uma concessão real: qualquer inline
  script que conseguisse ser injetado na página executaria. Mitigado (não
  eliminado) por React escapar interpolações por padrão — não há
  `dangerouslySetInnerHTML` com input de usuário no projeto — e por
  `connect-src` limitar para onde dados exfiltrados poderiam ir.
- Sem SRI, um script comprometido em `googletagmanager.com` ou
  `*.clarity.ms` executaria sem verificação de integridade — risco aceito
  em troca de não quebrar a cadeia de consentimento.
- `*.clarity.ms` e `*.googletagmanager.com` são wildcards de subdomínio, não
  origens exatas — mais superfície do que o mínimo necessário, mas
  necessário porque esses serviços servem de subdomínios variáveis.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| Nonce por request | Exige renderização dinâmica em toda rota; incompatível com o modelo estático/ISR do projeto. |
| `experimental.sri.algorithm` (Subresource Integrity) | Tentado e revertido: sem modo report, bloqueia qualquer script sem hash correto — quebrou silenciosamente a cadeia GTM → Custom HTML → Silktide, confirmado por diagnóstico de eliminação (commits 3559cc9 + 0302fe7). |
| Headers de segurança via `proxy.ts` | Mesma razão já documentada no ADR de rate limit da raiz: o guia do Next 16 desaconselha módulos/globals compartilhados em proxy, e `headers()` no `next.config.ts` já é o padrão nativo para isso. |
