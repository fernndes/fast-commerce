# Blog-0007 — Validação de performance e de campo na zona blog

- **Status:** aceito
- **Data:** 2026-08-13
- **Contexto:** `apps/blog` — `lighthouserc.js`, `.github/workflows/lighthouse-ci.yml`, `app/layout.tsx`

## Contexto

A tese do projeto é que atravessar a fronteira de deploy **não degrada Web
Vitals**, e que windowing puro sobre 10.000 itens cabe dentro do mesmo budget do
storefront. Uma tese dessas só vale se alguma coisa falhar quando ela deixar de
ser verdade.

## Decisão

### 1. Budget idêntico ao do storefront — de propósito

`lighthouserc.js` do blog usa os **mesmos números** do storefront:
`performance ≥ 0.95`, LCP ≤ 2500ms, CLS ≤ 0.1, TBT ≤ 200ms.

A igualdade é o ponto. Afrouxar o budget aqui provaria a tese por definição, não
por medição. O teto de TBT em particular é o que segura a promessa do windowing:
10.000 itens em memória não podem virar trabalho de main thread. Se a
virtualização regredir para "renderiza tudo", é ali que aparece primeiro.

As URLs medidas são a listagem virtualizada e um post pré-gerado. O slug do post
é fixo no arquivo — pode ser, porque a seed é fixa
([[0003-conteudo-via-faker-build-time-seed-fixa]]). Se a seed mudar, o slug muda
junto e o CI acusa; é o comportamento certo, não um incômodo.

### 2. Dois jobs de CI independentes

`lighthouse` (storefront) e `lighthouse-blog` rodam sem `needs` entre si. Dois
projetos de deploy, dois jobs: um quebrar não derruba o outro — o "blast radius"
que a separação promete.

O job do blog usa Node 24, porque `scripts/*.ts` roda direto pelo type-stripping
nativo, sem passo de compilação. E `npm run build` encadeia `generate:posts` e
`verify:posts`, então **a verificação de sanitização e integridade roda antes do
`next build`** e falha o job se um vetor de XSS sobreviver
([[0004-csp-consent-e-headers-entre-zonas]]).

### 3. A medição do Lighthouse é da zona ISOLADA

`next start -p 3001`, sem storefront e sem rewrite no meio. Mede-se a zona, não o
proxy. O custo do hop de rewrite é real em produção, mas é outra medição — e
misturar as duas tornaria impossível saber qual das duas regrediu.

### 4. RUM: as duas zonas caem no mesmo painel, por rota

`<SpeedInsights />` é montado no layout do blog. Sob Multi-Zones o script e o
endpoint de vitals (`/_vercel/insights/*`) resolvem contra o **domínio**, e o
domínio pertence ao projeto host — o storefront só reproxeia `/blog*` e
`/blog-static*`. Ou seja: os Web Vitals do blog chegam no dashboard do
storefront, identificados pela rota.

Isso é o que a validação pede, não um contorno: os dois conjuntos no mesmo
painel, separados por rota, é exatamente o que permite contrastar LCP de
storefront vs. blog **lado a lado** e provar que a travessia não degrada.

Redirecionar as métricas para o projeto do blog exigiria reescrever
`/blog-static/_vercel/*` para o `/_vercel/*` interno da zona — combinação que o
Next **proíbe**, porque `basePath: false` não vale para destino interno.
Investigado e descartado por impedimento da própria ferramenta.

## Consequências

**Positivas**

- Regressão de windowing (voltar a renderizar demais) quebra o CI pelo TBT.
- Regressão de conteúdo ou de sanitização quebra o CI antes mesmo do build.
- Comparação storefront vs. blog sai de graça no painel de RUM.
- Os dois apps continuam independentes no CI.

**Negativas / limitações aceitas**

- **O budget ainda não foi executado**: `lighthouserc.js` e o job existem, mas
  nenhuma rodada de Lighthouse foi feita neste ambiente. Os números de LCP/TBT/
  CLS da zona são desconhecidos até a primeira execução do CI. O que está
  verificado é estrutural (14 nós no DOM para 10.000 itens, ~48 KB de DOM,
  hidratação sem erro), não os Web Vitals.
- O Lighthouse mede a zona isolada, então o custo do hop de rewrite em produção
  não entra nesse número.
- Um preview do blog aberto direto na URL da Vercel reporta RUM para o projeto do
  blog. Números de preview e de produção não são comparáveis entre si.
- Não há hoje teste automatizado comparando as CSPs das duas zonas — a lacuna
  mais frágil, registrada em [[0004-csp-consent-e-headers-entre-zonas]].
- O INP da virtualização sob scroll longo não é medido pelo Lighthouse de
  laboratório (que não rola a página). Só o RUM de campo vai revelá-lo.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| Budget mais frouxo no blog | Provaria a tese por definição. A igualdade dos números é o experimento. |
| Um job de CI para os dois apps | Acoplaria os deploys que a arquitetura separa; a falha de um mascararia a do outro. |
| Medir o blog através do storefront | Mistura o custo do rewrite com o da zona; impossível saber o que regrediu. |
| `scriptSrc`/`endpoint` customizados no SpeedInsights | Exigiria um rewrite interno com `basePath: false`, proibido pelo Next. |
