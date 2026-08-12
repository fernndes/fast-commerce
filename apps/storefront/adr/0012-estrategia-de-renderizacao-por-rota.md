# ADR 0012 — Estratégia de renderização por rota: matriz cardinalidade × defasagem × conjunto

- **Status:** aceito
- **Data:** 2026-08-12
- **Contexto:** `apps/storefront`

## Contexto

O App Router do Next oferece quatro estratégias de geração de página — SSG
(estático puro no build), ISR (estático com revalidação), SSR (dinâmico por
request) e dinâmico forçado por `searchParams` — e a escolha errada tem
consequências opostas em dois eixos: SSG desnecessário infla o build; SSR
desnecessário destrói a escalabilidade e a performance. O projeto precisava de
um critério único, aplicável a qualquer rota nova, que produzisse a escolha
certa sem consultar um guia externo.

Cada rota foi decidida com esse critério, que é documentado aqui como modelo
de decisão, não apenas como resultado.

## Decisão

### 1. A matriz de três eixos

Três perguntas, respondidas nessa ordem, determinam a estratégia:

**Eixo 1 — Cardinalidade:** quantas variações distintas desta rota existem?
- *Baixa* — poucas e conhecidas no build: home, páginas institucionais,
  conjunto fixo de categorias.
- *Alta* — muitas ou ilimitadas: todos os produtos, qualquer termo de busca,
  qualquer combinação de filtros.

**Eixo 2 — Tolerância à defasagem:** o conteúdo pode estar alguns minutos
desatualizado?
- *Tolera* — catálogo, descrição, imagens. Se estiver 5 minutos velho,
  ninguém percebe.
- *Não tolera* — estoque ao segundo, preço em tempo real, resultado
  personalizado por sessão.

**Eixo 3 — Conjunto aberto ou fechado:** novos slugs/caminhos surgem depois
do build?
- *Fechado* — o conjunto é estável e conhecido no deploy.
- *Aberto* — produtos novos entram, slugs aparecem que não existiam quando o
  build rodou.

**Regra de prioridade:** o Eixo 2 tem poder de veto. Se o conteúdo não tolera
defasagem, a estratégia é SSR, independentemente dos outros dois eixos.
Se tolera, o Eixo 1 decide se vale pré-gerar; o Eixo 3 decide o
`dynamicParams`.

### 2. Mapeamento de rotas do projeto

| Rota | Cardinalidade | Defasagem | Conjunto | Estratégia | `dynamicParams` |
|------|---------------|-----------|----------|------------|-----------------|
| `/` (home) | Baixa | Tolera | Fechado | SSG/ISR | — |
| `/produtos` | Alta (filtros) | Tolera | — | Dinâmico (`searchParams`) | — |
| `/produtos/[slug]` | Alta (10k slugs) | Tolera | Aberto | ISR sob demanda (`generateStaticParams: []`, `revalidate: 3600`) | `true` (padrão) |
| `/categorias/[slug]` | Baixa (~7 dept + 23 sub) | Tolera | Fechado | ISR com `generateStaticParams` | `false` |
| `/busca` | Alta (query livre) | Tolera | — | Dinâmico (`searchParams`) | — |

### 3. Por que `dynamicParams: true` não precisa ser declarado na PDP

`true` é o valor padrão quando `generateStaticParams` existe. Para a PDP, o
que importa é que `generateStaticParams` retorne `[]` (ver
[[0008-pdp-generatestaticparams-vazio-isr-sob-demanda]]): a lista vazia
sinaliza ao Next que nenhuma rota está pré-gerada, e o comportamento
resultante — gerar sob demanda e cachear — depende de `dynamicParams: true`
que já é o default.

### 4. Por que SSR não aparece em nenhuma rota do catálogo

Nenhuma rota de catálogo exige dados em tempo real — o conjunto de dados é
um arquivo local (`data/big.json`, ver
[[0005-camada-de-dados-do-catalogo-leitura-via-fs]]) sem atualizações
frequentes. O Eixo 2 nunca veta SSG/ISR para o catálogo atual.

SSR entraria se o site passasse a consultar estoque em tempo real por pedido
ou preço personalizado por usuário. Nesse caso, a rota afetada mudaria de ISR
para SSR sem alterar as outras — o critério por eixo produz a mudança cirúrgica.

### 5. `searchParams` força dinâmico automaticamente

`/produtos` e `/busca` não declaram `export const dynamic = 'force-dynamic'`.
Elas se tornam dinâmicas por ler `searchParams` no Server Component — o Next
infere isso e desativa o cache estático para essas rotas. `force-dynamic`
aparece nas rotas de API (`/api/produtos`, `/api/busca/sugestoes`) porque ali
o Next 16 não cacheia por padrão (ver ADR 0006), e a declaração é de
intenção, não de workaround.

## Consequências

**Positivas**

- A home e as categorias são estáticas — servidas do edge sem invocar nenhuma
  função serverless na maioria dos requests.
- A PDP escala com ISR: o primeiro acesso a qualquer slug gera e cacheia a
  página; os subsequentes servem do cache. Com 10.000 produtos, gerar todos
  no build seria inviável (ver [[0008-pdp-generatestaticparams-vazio-isr-sob-demanda]]).
- O modelo de decisão se aplica a rotas futuras sem precisar de uma
  discussão do zero: os três eixos produzem a estratégia certa.

**Negativas / limitações aceitas**

- Rotas dinâmicas (`/produtos`, `/busca`) pagam o custo de execução em cada
  request, sem cache de resposta — mitigado pelo rate limiting
  (ver `docs/adr/0002-rate-limit-em-memoria-nas-rotas-de-api.md`) e
  pela indexação em memória do catálogo.
- O `revalidate: 3600` da PDP é um valor arbitrário — não há dado de
  frequência de mudança do catálogo que justifique uma hora como o intervalo
  certo, exceto por ser um default razoável sem telemetria real.
- Uma rota nova de alta cardinalidade e baixa tolerância à defasagem (preço
  em tempo real, por exemplo) cairia em SSR e quebraria a premissa de que
  "tudo o que é catálogo é ISR" — o modelo de decisão diz o que fazer,
  mas a decisão de arquitetura real de migrar o backend para servir dados
  ao vivo não é coberta aqui.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| SSG com `generateStaticParams` completo na PDP | 10.000 páginas geradas no build — minutos de compilação, `.next` gigante para atender uma cauda que quase ninguém acessa; inviável com o catálogo atual (ver [[0008-pdp-generatestaticparams-vazio-isr-sob-demanda]]). |
| SSR em todas as rotas | Destrói a escalabilidade das rotas de catálogo: cada request paga o custo de `listProducts`/`getProductBySlug` sem benefício de cache, mesmo para conteúdo que tolera defasagem. |
| Decidir por rota caso a caso sem critério unificado | Rotas futuras seriam decididas por intuição ou por quem mexeu por último, sem rastreabilidade. O modelo de três eixos produz a mesma decisão toda vez e pode ser auditado. |
