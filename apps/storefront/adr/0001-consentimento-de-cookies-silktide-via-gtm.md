# ADR 0001 — Consentimento de cookies (Silktide) entregue via GTM

- **Status:** aceito
- **Data:** 2026-08-06
- **Contexto:** `apps/storefront`

## Contexto

O site carrega scripts de terceiros com implicação de privacidade — Google
Tag Manager (GTM), Google Analytics, Microsoft Clarity — e por isso precisa
de um banner de consentimento de cookies. A escolha foi o Silktide Consent
Manager, uma lib self-hosted (`public/consent/silktide-consent-manager.js` +
`.css`) que expõe uma API global (`window.silktideConsentManager.init(...)`)
e integra com o Google Consent Mode.

O ponto que este ADR precisa deixar explícito, porque não é óbvio lendo só
`app/layout.tsx`: **não existe nenhum `<Script src="/consent/...">` nem
componente React que carregue o Silktide no código do app.** Buscar por
`silktide` em `app/` e `components/` não encontra nada além dos dois
arquivos estáticos em `public/consent/`.

## Decisão

### 1. GTM é o mecanismo de entrega do Silktide, não o contrário

`app/layout.tsx` monta só o container GTM:

```tsx
<html lang="pt-BR" ...>
  <GoogleTagManager gtmId="GTM-W48GGZQP" />
  <head>...</head>
  <body>...</body>
</html>
```

`<GoogleTagManager>` (de `@next/third-parties/google`) renderiza dois
`next/script` sem `strategy` explícita — ou seja, `afterInteractive`, o
padrão. O bootstrap do GTM dispara **incondicionalmente pouco depois da
hidratação, para todo visitante, sem gate de consentimento algum.**

Dentro do container GTM (configurado no dashboard do Google, fora deste
repo) existe uma tag "Custom HTML" que carrega
`/consent/silktide-consent-manager.js` (self-hosted, coberto por
`script-src 'self'` na CSP — ver [[0002-csp-por-origem-sem-nonce-nem-sri]])
e chama `window.silktideConsentManager.init({ consentTypes: [...] })`
inline. É essa tag Custom HTML — não código deste repo — que efetivamente
liga o Silktide.

O comentário de rationale da CSP em `next.config.ts` confirma essa cadeia
como fato conhecido pelo time: *"GTM injeta bootstrap + Custom HTML (init do
Silktide) inline"*.

### 2. O que o Silktide efetivamente controla

Dentro da própria lib (`public/consent/silktide-consent-manager.js`), cada
`consentType` tem um mapeamento `gtag` para o Google Consent Mode:

```js
triggerConsentIntegration(consentType, accepted) {
  if (!consentType.gtag) return;
  const consentState = accepted ? 'granted' : 'denied';
  gtag('consent', 'update', { [param]: consentState });
  window.dataLayer.push({ event: this.config.eventName });
}
```

Ou seja: o Silktide não bloqueia o *carregamento* de scripts de forma
genérica — ele envia um sinal de consent mode que as tags configuradas
*dentro do GTM* (GA4, Clarity) podem respeitar. **O próprio container GTM,
e qualquer coisa que dispare antes da tag de consentimento rodar dentro
dele, não é bloqueado por este design.**

### 3. Posição do `<GoogleTagManager>` no layout

O elemento ficou em três posições diferentes até estabilizar na atual:

1. `abf3c47` (2026-07-31) — fim de `<body>`, depois do `<Footer />`.
2. `0ca9423` (2026-08-06) — movido para dentro de `<head>...</head>`, como
   primeiro filho. Incorreto: `GoogleTagManager` é um client component que
   envolve `next/script`, e a doc do `@next/third-parties` não recomenda
   aninhar dentro de `<head>`.
3. `a3d8127` (2026-08-06, mesmo dia) — corrigido para irmão direto de
   `<head>`, sob `<html>` — posição final, igual ao exemplo canônico da lib.

## Consequências

**Positivas**

- Zero código de consentimento para manter neste repo além dos dois
  arquivos estáticos — toda a lógica de quais tags esperam consent vive na
  configuração do container GTM, editável sem deploy.
- Self-hosting do Silktide (em vez de CDN de terceiro) mantém a CSP simples:
  nenhum domínio externo do Silktide precisa entrar em `script-src`.
- Integração nativa com Google Consent Mode via `gtag('consent', 'update')`,
  o mecanismo que GA4/Ads esperam.

**Negativas / limitações aceitas**

- O container GTM em si — e qualquer tag disparada antes do Custom HTML do
  Silktide rodar — carrega sem esperar consentimento. "Gerenciador de
  consentimento" aqui não significa "nada carrega antes do consentimento";
  significa "as tags configuradas dentro do GTM podem ser condicionadas a
  ele". Ler o código deste repo isoladamente sugeriria o contrário.
- `@next/third-parties`' `GoogleTagManager` não emite o fallback
  `<noscript><iframe src=".../ns.html?id=...">` que o snippet oficial do
  Google recomenda logo após `<body>`. Usuários sem JS não recebem sinal
  algum do GTM — aceito, já que o resto do site também depende de JS para
  as ilhas client (ver [[0001-carrossel-css-scroll-snap-e-ilhas-client]] na
  ADR da raiz).
- `gtmId="GTM-W48GGZQP"` está hardcoded em `app/layout.tsx`, sem variável de
  ambiente — trocar de container (ex.: ambiente de staging) exige editar
  código, não configuração.
- A configuração real do que o Silktide bloqueia ou libera vive inteiramente
  fora deste repositório (dashboard do GTM), então uma auditoria de
  conformidade de cookies não consegue ser feita só lendo o código-fonte.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| Carregar o Silktide diretamente pelo app (`<Script src="/consent/...">` em `app/layout.tsx`), fora do GTM | Duplicaria a orquestração — o time já usa o GTM como camada de gerenciamento de tags para GA4/Clarity; inicializar o Silktide fora dele quebraria o padrão de "tudo passa pelo GTM" e ainda exigiria coordenar a ordem de carregamento manualmente. |
| Gate de consentimento envolvendo o próprio `<GoogleTagManager>` (não montar o componente até o usuário aceitar) | Impediria o Custom HTML que inicializa o Silktide de rodar — o banner de consentimento em si depende do GTM para aparecer, então bloquear o GTM até haver consentimento é uma dependência circular. |
