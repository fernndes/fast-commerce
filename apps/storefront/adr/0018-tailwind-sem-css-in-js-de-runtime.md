# ADR 0018 — Tailwind como base de estilo, sem CSS-in-JS de runtime

- **Status:** aceito
- **Data:** 2026-08-12
- **Contexto:** `apps/storefront`

## Contexto

O projeto precisa de uma abordagem de estilo que não contradiga sua tese
central de performance. A escolha de CSS não é questão de preferência estética
— cada abordagem tem um perfil de custo de performance diferente, e num projeto
onde TBT e bundle size são métricas contratuais (travadas no `lighthouserc.js`),
essa escolha tem consequências mensuráveis.

O fator adicional que separa este projeto de um projeto React genérico: o uso
extensivo de **React Server Components** (App Router). Abordagens de estilo
que dependem de JavaScript de runtime no cliente são incompatíveis com RSC por
definição — um Server Component não executa no browser.

## Decisão

### 1. O eixo que organiza a decisão: quando o custo é pago

A pergunta central não é "qual CSS fica mais bonito" — é **quando o custo de
estilo é pago**:

- **Build time:** o CSS é processado durante o `next build` e entregue como
  arquivo estático. Zero custo de runtime no browser.
- **Runtime:** o CSS é gerado por JavaScript no browser, durante ou após a
  renderização. Custa tempo de execução JS, que sai do TBT.

Essa distinção determina qual abordagem é compatível com a tese de performance.

### 2. CSS-in-JS clássico — descartado

`styled-components`, `Emotion` e similares geram estilos **por JavaScript em
runtime**: o componente monta, a lib calcula as classes, injeta `<style>` no
DOM. Três consequências diretas para as métricas do projeto:

O bundle embarca a runtime da lib (kilobytes que o usuário baixa e o browser
parseia antes de qualquer interação). O cálculo de estilo acontece durante a
renderização — custo de TBT, a métrica mais afetada por JavaScript de longa
execução. E o mais grave para este projeto: CSS-in-JS clássico é
**incompatível com React Server Components** — a lib assume execução no cliente
e precisa de contexto React, que não existe em RSC. Usar CSS-in-JS forçaria
componentes que deveriam ser Server a se tornar Client, aumentando
desnecessariamente o JavaScript enviado ao browser.

CSS-in-JS clássico foi descartado sem teste — a incompatibilidade com RSC é
estrutural, não de configuração.

### 3. Sass / CSS Modules — compatível, mas com ponto fraco específico

Sass compila para CSS puro no build; CSS Modules faz o escopamento de classes
no build. O browser recebe CSS estático — zero runtime, zero JS de estilo,
zero custo de TBT. É tecnicamente compatível com Server Components e com a
tese de performance.

O ponto fraco não é performance — é **eliminação de código morto**: garantir
que só o CSS usado acima da dobra chegue primeiro, e que classes não-usadas
não inflem o bundle, requer disciplina manual. Com um projeto crescendo em
páginas e componentes, CSS não-usado acumula e o arquivo cresce sem controle.
É um problema gerenciável, mas sem automação — depende de vigilância.

O projeto vem de Sass (aparece nos CVs e na experiência anterior). A familiaridade
favorece velocidade de desenvolvimento, que é um fator legítimo num projeto
feito nas horas vagas.

### 4. Tailwind — escolhido como base

Tailwind é, tecnicamente, da mesma família do Sass neste eixo: CSS gerado no
build, zero runtime no browser, compatível com Server Components. Mas resolve
o ponto fraco do Sass **por construção**: o compilador varre o código e gera
**apenas as classes referenciadas**. Classe não usada não existe no CSS final.

A consequência: o bundle de CSS não cresce conforme o projeto cresce — ele
plafona, porque o vocabulário de utilitários é finito e compartilhado entre
todos os componentes. Num e-commerce acumulando páginas, a diferença entre
CSS que incha (risco no Sass mal gerido) e CSS estável (Tailwind por padrão)
é mensurável.

A compatibilidade com Server Components é total porque Tailwind é classes CSS —
não há runtime, não há contexto React, não há diferença entre Server e Client
Component para o CSS.

**O trade-off consciente:** Tailwind tem custo de legibilidade
(`className="flex items-center gap-4 rounded-lg px-6 py-3 text-sm font-medium"`)
e curva de aprendizado de utilitários. Para alguém com background em Sass, a
transição tem atrito real, e produtividade importa num projeto de horas vagas.

### 4.1 Consequência prática do "varre o código como texto": classes têm que ser literais

O compilador do Tailwind não executa JavaScript — ele varre os arquivos-fonte
como **texto** procurando por strings que casem com classes válidas. Uma
classe montada em runtime (`` `grid-cols-${n}` ``) nunca aparece como
substring literal no código-fonte, então é varrida do CSS final: a classe
existe em tempo de execução mas não tem regra correspondente, e o layout
quebra silenciosamente — sem erro de build, sem aviso, só uma grade que não
vira grade. `components/banner/banner-section.tsx` é o exemplo do projeto:
o número de colunas do layout (`grid-cols-3`, `grid-cols-1 sm:grid-cols-2`
etc.) e o `sizes` da imagem correspondente moram na mesma tabela, escritos
como classes completas por chave — nunca interpolados — porque são a mesma
decisão dita em duas linguagens (CSS e o atributo `sizes`) e o Tailwind só
enxerga a primeira se ela estiver escrita por extenso.

### 5. Coexistência com Sass/CSS Modules em casos específicos

Os dois pertencem à mesma família ("custo no build"), então convivem sem
conflito de performance. Sass ou CSS Modules entram pontualmente quando
Tailwind fica inadequado: animações complexas com muitos keyframes, um design
token muito específico, ou um componente com CSS genuinamente intrincado onde
a verbosidade de utilitários tornaria o código ilegível.

O que **não** se mistura é CSS-in-JS de runtime — que é de categoria diferente
e reintroduziria custo no browser.

## Consequências

**Positivas**

- Zero JavaScript de estilo no browser — nenhum custo de TBT atribuível a CSS.
- Compatibilidade total com Server Components: a mesma classe Tailwind funciona
  identicamente em Server e Client Component.
- CSS final contém apenas o que está em uso — eliminação automática de código
  morto sem disciplina manual.
- O bundle de CSS cresce de forma previsível e controlada conforme o projeto
  escala.

**Negativas / limitações aceitas**

- Legibilidade do JSX degradada por longas sequências de classes em componentes
  complexos. Mitigado com extração em variáveis ou componentes, mas não
  eliminado.
- Curva de aprendizado dos utilitários para quem vem de Sass — tempo de
  adaptação real nas primeiras semanas.
- Tailwind não substitui CSS customizado onde há animações ou tokens muito
  específicos; esses casos exigem Sass/CSS Modules suplementar, mantendo dois
  sistemas no projeto.
- A classe Tailwind `invisible` (usada no mega menu, ver
  [[0017-mega-menu-css-puro-group-hover-focus-within]]) tem semântica diferente
  de `hidden` — mantém o elemento no DOM mas invisível. Quem não conhece a
  distinção pode introduzir bugs de acessibilidade ao alternar entre as duas.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| CSS-in-JS clássico (styled-components, Emotion) | Incompatível com React Server Components por design — assume execução no cliente. Adiciona runtime ao bundle e custa TBT. Descartado sem teste por ser estruturalmente incompatível com a arquitetura do projeto. |
| Sass/CSS Modules exclusivo | Compatível com performance e RSC, mas sem purge automático de código morto — requer disciplina manual para não inflar o bundle CSS conforme o projeto cresce. Viável, mas Tailwind resolve esse ponto por construção. |
| CSS Modules + Tailwind (sem Sass) | Redundante com o que o Tailwind já oferece para escopamento. A combinação faz sentido quando há tokens de design complexos, não como padrão geral. |
| Zero-runtime CSS-in-JS (vanilla-extract, linaria) | Compatível com RSC e com performance (custo no build). Descartado por ser mais novo, ter ecossistema menor, e não adicionar vantagem concreta sobre Tailwind para os casos de uso do projeto. Pode ser avaliado se Tailwind se mostrar inadequado. |
