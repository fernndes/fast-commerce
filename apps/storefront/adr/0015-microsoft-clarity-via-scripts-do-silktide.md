# ADR 0015 — Microsoft Clarity entregue via propriedade `scripts` do Silktide

- **Status:** aceito
- **Data:** 2026-08-12
- **Contexto:** `apps/storefront`

## Contexto

O Microsoft Clarity (heatmaps e session replay) foi adicionado como ferramenta
de usabilidade. Como qualquer ferramenta de session replay, ele precisa de gate
de consentimento rigoroso — gravar sessões de usuários sem consentimento é uma
violação GDPR/LGPD mais séria do que coletar um ping anônimo de analytics.

A integração foi tentada por dois caminhos antes de chegar na solução final:

1. **Tag Custom HTML no GTM** — o Clarity foi adicionado como uma tag Custom
   HTML no container GTM, com "Exigir consentimento adicional →
   `analytics_storage`" configurado. Essa checagem se mostrou não confiável
   para tags Custom HTML: o Tag Assistant do GTM mostrou a tag "disparando"
   mesmo com `analytics_storage: denied`. O comportamento foi confirmado como
   limitação conhecida do GTM — o mecanismo de "exigir consentimento adicional"
   é aplicado de forma confiável em tags nativas (Tag do Google) mas não em
   HTML customizado arbitrário.

2. **Template oficial Microsoft Clarity no GTM** — tentado como alternativa,
   reportou "Falhou" no Tag Assistant. A causa foi CSP bloqueando
   `scripts.clarity.ms` (o segundo estágio do loader), pois a política permitia
   `www.clarity.ms` mas não o subdomínio de entrega do script real.

3. **Propriedade `scripts` do Silktide** — a solução final, descrita abaixo.

## Decisão

### 1. Clarity entregue pela propriedade `scripts` do tipo `analytics` no Silktide

O Silktide Consent Manager oferece uma propriedade `scripts` por tipo de
consentimento que injeta scripts externos **somente quando o usuário concede
consent para aquele tipo**. A entrega acontece no nível da lib de consent, não
no GTM — o Clarity nem existe no container GTM.

A configuração fica na Custom HTML do Silktide no GTM (fora deste repo):

```js
{
  id: "analytics",
  label: "Analytics",
  gtag: "analytics_storage",
  scripts: [
    {
      url: "https://www.clarity.ms/tag/y0udo7g59m",
      load: "async",
      type: "text/javascript"
    }
  ],
  onAccept: function() {
    window.clarity = window.clarity || function() {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };
  }
}
```

O campo `scripts` instrui o Silktide a criar e injetar a tag `<script>` para
a URL do Clarity quando o usuário aceita o tipo `analytics`. O `onAccept`
inicializa o stub de fila de comandos (`window.clarity.q`) que o script
assíncrono consumirá ao carregar.

O Silktide também **recarrega a página quando o consent é revogado** para um
tipo que tinha scripts injetados — comportamento documentado na release note
da v2: *"if the user later revokes consent, the page automatically reloads —
this ensures any scripts already running are torn down cleanly"*. Isso garante
que uma revogação de consent efetivamente para o Clarity, sem depender de uma
API de opt-out que o Clarity pudesse expor ou não.

### 2. CSP cobre a cadeia completa de dois estágios

O Clarity funciona em dois estágios:

1. `https://www.clarity.ms/tag/y0udo7g59m` — o loader (script pequeno).
2. `https://scripts.clarity.ms/0.x.y/clarity.js` — o script real, carregado
   pelo loader.

Os dois vêm de subdomínios distintos de `clarity.ms`. A CSP em
`next.config.ts` precisa cobrir ambos com wildcard:

```
script-src '...' https://*.clarity.ms;
connect-src '...' https://*.clarity.ms;
```

O `connect-src` é necessário porque o Clarity envia as gravações para
endpoints de ingestão (também subdomínios de `clarity.ms`). A descoberta do
segundo estágio foi feita em produção — o loader carregava com sucesso (a
CSP permitia `www.clarity.ms`) mas `clarity.js` falhava (a CSP não permitia
`scripts.clarity.ms`). O wildcard resolve os dois estágios e futuros
subdomínios de ingestão.

### 3. Por que a propriedade `scripts` resolve o que o GTM não resolve

O mecanismo de "exigir consentimento adicional" do GTM verifica o estado de
consent no momento de avaliação do trigger — mas para tags Custom HTML, a
execução pode acontecer antes dessa verificação ser aplicada de forma
determinística. O `scripts` do Silktide inverte a ordem: o script só existe
na página se e somente se o tipo `analytics` foi aceito. Não há nada para
"bloquear depois" — a tag simplesmente não foi criada.

Além disso, o GA4 (Tag do Google) pode usar "Consent Mode nativo" do Google
para operar em modo cookieless quando negado — o Clarity não tem esse
mecanismo. Para o Clarity, a única forma segura de consent é controlar se o
script carrega, não o que ele faz após carregar.

## Consequências

**Positivas**

- O gate de consentimento é determinístico: o script do Clarity não existe
  na página antes de `analytics_storage` ser concedido.
- A revogação de consent dispara reload automático, removendo o script já
  carregado sem depender de uma API de opt-out.
- A tag do Clarity não existe no container GTM — menos tags no container,
  menos superfície de configuração incorreta.

**Negativas / limitações aceitas**

- A configuração real do Clarity (o objeto `scripts` no tipo `analytics`)
  vive no dashboard do GTM, fora deste repo — uma auditoria não consegue
  verificar o gate só pelo código-fonte.
- O reload automático na revogação de consent interrompe a sessão do usuário.
  É o comportamento correto de conformidade, mas pode ser percebido como um
  bug por alguém que revoga e vê a página recarregar sem razão óbvia.
- O Clarity como ferramenta de session replay é pesado — grava movimentos
  de mouse, scroll e mutações de DOM continuamente. O impacto no TBT deve
  ser medido após a implementação para verificar se o orçamento de performance
  do `lighthouserc.js` ainda é respeitado.
- `*.clarity.ms` em `script-src` é um wildcard de subdomínio — mais superfície
  do que o mínimo necessário, necessário porque o loader e o script real
  vêm de subdomínios distintos e dinâmicos.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| Tag Custom HTML no GTM com "exigir consentimento adicional" | Gate não confiável para Custom HTML — confirmado no Tag Assistant: a tag disparou com `analytics_storage: denied`. |
| Template oficial Microsoft Clarity no GTM | Reportou "Falhou" no Tag Assistant por CSP bloqueando `scripts.clarity.ms` (segundo estágio do loader) — e o template nativo do GTM, assim como a Custom HTML, não tem o gate determinístico que o `scripts` do Silktide oferece. |
| Carregar Clarity via `next/script` no `app/layout.tsx` condicionalmente | Exigiria estado client no layout (ler o localStorage de consentimento no cliente antes de montar o script), quebrando o layout como Server Component e adicionando JS ao caminho crítico de toda página. |
| API de consent nativa do Clarity (`clarity('consent')`) | Carregaria o script incondicionalmente e o desabilitaria por chamada de API — o script ainda carrega e executa; só para de enviar dados. Não é o mesmo que não carregar. Para session replay, onde o script grava ativamente, isso não é suficiente. |
