# ADR 0002 — Rate limit em memória nas rotas de API

- **Status:** aceito
- **Data:** 2026-08-12
- **Contexto:** `apps/storefront`

## Contexto

As duas rotas de API do storefront — `app/api/produtos/route.ts` e
`app/api/busca/sugestoes/route.ts` — aceitavam requests sem qualquer teto.
Ambas são caras por request: `listProducts` faz uma varredura linear filtro +
sort + paginação sobre os 10k produtos em memória, sem cache de resultado; e
`getSuggestions` varre o catálogo. A única contenção era o debounce de 200ms no
cliente (`components/header/search-suggestions.tsx`), que roda no browser e é
trivialmente contornável por um loop de `curl`.

Um flood satura CPU de função serverless e infla o billing — inclusive o do
Sentry, que está com `tracesSampleRate: 1`.

## Decisão

Teto de **100 requests/minuto por IP** nas rotas de `/api`, respondendo `429`
acima disso, seguindo o padrão do guia oficial
([backend-for-frontend#rate-limiting](https://nextjs.org/docs/app/guides/backend-for-frontend#rate-limiting)).

### 1. Contador em memória de processo, sem dependência

`lib/rate-limit.ts` mantém um `Map<ip, timestamps[]>` no escopo do módulo e
aplica uma **janela deslizante** (sliding window log) de 60s. Zero dependências
novas, zero env vars, zero round-trip de rede por request.

Janela deslizante e não fixa de propósito: com janela fixa por minuto de
relógio, 100 requests em `:59` mais 100 em `:00` passariam — 200 em dois
segundos. A deslizante fecha essa borda.

Memória contida por dois mecanismos: um *sweep preguiçoso* (sem `setInterval`,
que não sobrevive a lambda) que varre o Map no máximo uma vez por janela
deletando IPs expirados, e um *backstop* que zera o Map se ele cruzar
`MAX_KEYS` sob um flood distribuído com IPs forjados.

### 2. Checagem nos route handlers, não em `proxy.ts`

A checagem é a primeira linha de cada `GET`, antes de qualquer parse ou I/O.
No Next 16 o antigo `middleware.ts` virou `proxy.ts`, mas os docs avisam que
proxy "should not attempt relying on shared modules or globals" (`proxy.md:19`)
— exatamente o oposto do que um contador em memória precisa. O helper no
handler é também o formato do exemplo canônico do guia.

O limite é **por IP e compartilhado entre as duas rotas**: o teto protege o
processo, não cada endpoint isoladamente.

### 3. IP via `x-forwarded-for`

`NextRequest.ip` foi removido no Next 15. O IP sai do header
`x-forwarded-for` (primeiro item, o cliente real quando há um proxy confiável
na frente), com `x-real-ip` como alternativa e `'unknown'` como fallback (o
`next dev` local).

## Consequências

**Positivas**

- Abuso por loop de `curl` é barrado sem infra nova nem custo de rede.
- A assinatura (`async checkRateLimit(request: Request)`) é um drop-in para um
  store em rede depois: trocar o miolo por Upstash/Vercel KV não toca em nenhum
  route handler.
- Headers `RateLimit-*` (draft IETF) + `Retry-After` em toda resposta, para o
  cliente ver o orçamento restante.

**Negativas / limitações aceitas**

- **Não é um limite global preciso.** Em serverless cada instância tem seu
  próprio Map, então sob escala horizontal o teto efetivo é `N × 100/min`, não
  100/min. Atenua abuso (um flood concentrado cai em poucas instâncias e é
  barrado), mas não é auditável. Gatilho para migrar para store distribuído:
  tráfego de abuso real observado que escape do teto por instância, ou
  necessidade de um limite preciso/auditável.
- **`x-forwarded-for` é forjável** a menos que um proxy confiável o reescreva na
  frente. Na Vercel a plataforma faz isso; um deploy exposto direto perderia a
  garantia. Documentado no docblock do módulo.
- O backstop `MAX_KEYS` é fail-open: sob flood distribuído extremo, prefere
  perder um minuto de contagem a crescer sem limite.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| Upstash Redis / Vercel KV | Contagem distribuída e precisa, mas cobra dependência nova, conta externa, 2 env vars e um round-trip de rede por request. Reservado para quando o limite por instância não bastar. |
| `proxy.ts` com `matcher: '/api/:path*'` | Cobriria rotas futuras automaticamente, mas os docs do v16 desaconselham globals/módulos compartilhados em proxy — frágil justamente para um contador em memória. |
| Janela fixa por minuto de relógio | Efeito de borda: até 2× o limite na virada do minuto. |
| Só o debounce no cliente | Roda no browser, contornável por qualquer cliente HTTP. |
