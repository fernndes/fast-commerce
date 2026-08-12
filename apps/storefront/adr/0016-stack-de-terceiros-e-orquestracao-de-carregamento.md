# ADR 0016 — Stack de terceiros: inventário, orquestração e teto de performance

- **Status:** aceito
- **Data:** 2026-08-12
- **Contexto:** `apps/storefront`

## Contexto

A tese central do projeto é que uma loja performática não é uma loja sem
terceiros — é uma loja que carrega todos os terceiros que o negócio, o
marketing e a lei obrigam, e ainda mantém Web Vitals excelentes. O desafio
de performance em e-commerce não é otimizar um site vazio; é espremer
velocidade máxima com o peso obrigatório a bordo.

Este ADR documenta o inventário de terceiros atual, como cada um é carregado,
a relação entre eles, e o teto de performance que eles impõem — o que é
controlável e o que não é. Não é uma comparação de ferramentas; cada terceiro
aqui estava presente por necessidade (analytics, consent, usabilidade).

## Decisão

### 1. Inventário e mecanismo de entrega

| Terceiro | Propósito | Mecanismo de entrega | Consent |
|----------|-----------|----------------------|---------|
| GTM (GTM-W48GGZQP) | Orquestrador de tags | `@next/third-parties/google` → `<GoogleTagManager>` no layout | Incondicionalmente (ver [[0001-consentimento-de-cookies-silktide-via-gtm]]) |
| GA4 (G-WHXGNS05FR) | Analytics de produto | Tag do Google dentro do GTM | Consent Mode v2, depende de `analytics_storage` |
| Silktide Consent Manager | Banner de consent GDPR/LGPD | Custom HTML dentro do GTM | Não se aplica (é o próprio mecanismo de consent) |
| Microsoft Clarity | Heatmaps e session replay | Propriedade `scripts` do tipo `analytics` do Silktide | Depende de `analytics_storage` aceito (ver [[0015-microsoft-clarity-via-scripts-do-silktide]]) |
| Vercel Speed Insights | RUM de Web Vitals de campo | `<SpeedInsights />` de `@vercel/speed-insights/next` no layout | Não coleta dados de usuário individual identificável |

### 2. GTM como ponto único de entrada, não como intermediário universal

O GTM é o orquestrador do ecossistema Google (GA4) e do consent (Silktide).
O Clarity **não** passa pelo GTM — entrega direta via Silktide (ver
[[0015-microsoft-clarity-via-scripts-do-silktide]]). O Speed Insights também
não passa pelo GTM — é um componente React do próprio ecossistema Vercel.

Essa separação reflete responsabilidades: GTM gerencia o que o marketing
precisa configurar sem deploy; Silktide controla o que precisa de gate de
consentimento determinístico para terceiros não-Google; Vercel Speed Insights
é infraestrutura de observabilidade de performance.

### 3. Estratégia de carregamento: `afterInteractive` via `@next/third-parties`

`<GoogleTagManager>` de `@next/third-parties/google` renderiza `next/script`
sem `strategy` explícita, usando o padrão `afterInteractive`. O script do GTM
carrega depois da hidratação da página — não bloqueia o LCP nem a hidratação
inicial.

Isso significa que o bootstrap do GTM, e tudo que depende dele (Silktide,
GA4, e por tabela o Clarity via `scripts` do Silktide), aparece **depois** da
hidratação. O banner de consent não é exibido no primeiro paint — aparece
alguns instantes depois. Esse comportamento foi aceito: bloquear a
hidratação para exibir o banner mais cedo seria trocar CLS/LCP por
conformidade aparente; a conformidade real é que o GA4 e o Clarity não coletam
nada antes do banner aparecer e do usuário escolher.

### 4. O teto de performance imposto pelos terceiros

O stack de terceiros adiciona custo de TBT (Total Blocking Time) que não é
eliminável por estratégia de carregamento — apenas adiável. Com todos os
terceiros a bordo, o site mantém 95-100 no PageSpeed, com variação entre
medições.

Esse é o número que importa para a tese: **não é 100 num site vazio, é 95-100
com GTM + GA4 + Silktide + Clarity a bordo**. A variação entre medições é
inerente ao Lighthouse (que simula carga de CPU e rede) — não é sinal de
instabilidade, é o comportamento esperado de um ambiente de laboratório com
ruído.

A distinção entre o que é controlável e o que é teto imposto:

- **Controlável**: estratégia de carregamento (adiar via `afterInteractive`),
  quantidade de tags dentro do GTM, peso de cada tag, se usa `lazyOnload`
  em vez de `afterInteractive`.
- **Teto imposto**: o custo de execução do GTM, GA4, Silktide e Clarity
  uma vez que estão a bordo. Mesmo `lazyOnload` só adia o custo — não o
  elimina. O TBT mínimo com esse stack é o custo de execução desses scripts.

### 5. O `lazyOnload` do GTM foi considerado e descartado

Adiar o GTM com `strategy="lazyOnload"` foi avaliado como forma de reduzir o
TBT. A decisão foi contra por uma razão estrutural: o GTM carrega o Silktide
via Custom HTML. Com `lazyOnload`, o banner de consent aparece significativa-
mente mais tarde — o usuário interage com o site por vários segundos antes de
ver o banner. Isso compromete a conformidade GDPR/LGPD: o consent deve ser
oferecido antes da interação, não durante.

A tensão é inerente: adiar mais o GTM melhora o TBT inicial, mas atrasa o
banner que é obrigatório. O `afterInteractive` (carrega após hidratação) foi
o equilíbrio aceito — o banner aparece rapidamente após o carregamento, sem
bloquear o LCP ou a hidratação.

### 6. CSP cobre todos os terceiros

A Content-Security-Policy em `next.config.ts` (ver
[[0002-csp-por-origem-sem-nonce-nem-sri]]) lista explicitamente cada domínio
de terceiro necessário:

- `script-src`: `googletagmanager.com`, `*.clarity.ms`
- `connect-src`: `*.google-analytics.com`, `*.analytics.google.com`,
  `*.googletagmanager.com`, `*.clarity.ms`
- `img-src`: `*.googletagmanager.com`, `*.google-analytics.com` (pixels)

O Silktide é self-hosted em `/consent/`, coberto por `'self'` sem entry
adicional na CSP.

## Consequências

**Positivas**

- O inventário de terceiros está documentado num lugar único, com
  mecanismo de entrega e gate de consent de cada um.
- A performance com o stack completo foi medida: 95-100 no PageSpeed —
  a tese do projeto (loja rápida com tudo que uma loja real tem) está
  comprovada com número.
- A separação GTM / Silktide-`scripts` / Speed Insights torna o sistema
  auditável: cada terceiro tem um ponto de entrada claro.

**Negativas / limitações aceitas**

- A configuração de quais tags dispararam e com qual gate de consent vive
  no dashboard do GTM, fora deste repo — auditoria completa exige inspecionar
  o container GTM além do código.
- GTM carregado com `afterInteractive` significa que o banner de consent,
  GA4 e Clarity chegam alguns instantes após a hidratação — não no primeiro
  paint. Aceito como equilíbrio entre performance e conformidade.
- O custo de TBT do stack é irredutível por estratégia de carregamento no
  Next — é o preço de ter um e-commerce real com analytics, consent e
  session replay. O teto de performance medido é 95-100 (não 100 fixo).
- Adicionar um quinto terceiro (ex.: chat de suporte, pixel de marketing)
  exige: (1) avaliar o impacto no TBT medindo antes/depois, (2) garantir
  gate de consent via GTM ou `scripts` do Silktide, (3) adicionar os
  domínios à CSP. Não há automação — é processo manual.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| Partytown (web worker para terceiros) | GTM carregado no worker levaria o Silktide junto. O Silktide precisa de acesso síncrono ao DOM (renderiza o banner, captura cliques, escreve no localStorage) — incompatível com o modelo de proxy assíncrono do Partytown. Confirmado que quebrava o consent banner em testes. |
| `strategy="lazyOnload"` para o GTM | Adia o banner de consent para depois da interação do usuário — compromete a conformidade GDPR/LGPD. O custo de TBT é adiado, não eliminado. |
| Carregar Clarity direto no layout sem consent | Session replay sem consentimento é violação GDPR/LGPD severa. Descartado sem consideração. |
| Vercel Web Analytics em vez de GA4 | O GA4 via GTM foi escolhido por ser o padrão de mercado em e-commerce, representando o caso real de terceiro pesado que o projeto se propõe a demonstrar e otimizar. O Web Analytics da Vercel seria mais leve, mas menos representativo. |
