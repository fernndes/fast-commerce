# Blog-0004 — CSP, consent e security headers replicados entre zonas

- **Status:** aceito
- **Data:** 2026-08-13
- **Contexto:** `apps/blog` — `next.config.ts`, `app/layout.tsx`, `scripts/generate-posts.ts`

## Contexto

**Cada zona serve seus próprios headers.** O `headers()` do storefront não cobre
as respostas que a zona blog gera — são dois deploys, dois servidores. Ao mesmo
tempo, as duas zonas vivem sob o **mesmo domínio**, então uma CSP mais frouxa no
blog é, do ponto de vista de quem ataca, uma CSP mais frouxa no site inteiro.

É aqui que segurança e performance colidem, e com Multi-Zones a colisão dobra: a
política precisa ser idêntica em dois `next.config.ts` que fazem deploy separado
e podem divergir sem que nada quebre visivelmente.

## Decisão

### 1. CSP replicada, origem por origem

O `cspHeader` do blog é cópia literal do storefront (ADR 0002): mesmas origens
para `googletagmanager.com`, `*.clarity.ms`, `dummyimage.com`, mesmo
`'unsafe-inline'`, mesma abertura extra só em desenvolvimento. Nonce e SRI seguem
descartados pelos mesmos motivos de lá (nonce quebra rota estática; SRI quebra a
cadeia GTM→Silktide silenciosamente).

O blog **não precisou acrescentar nada**, e isso é consequência de duas decisões
anteriores:

- `connect-src 'self'` já cobre o fetch único do índice, porque ele é
  same-origin (`/blog/blog-data/...`). Não há endpoint de paginação a autorizar
  — ver [[0002-windowing-puro-sobre-indice-estatico-unico]].
- `script-src 'self'` já cobre os assets da zona, porque `assetPrefix` é um
  caminho same-origin e não um subdomínio — ver
  [[0001-multi-zones-assetprefix-rewrites-e-navegacao]].

Security headers (HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`,
`Permissions-Policy`) replicados com valores idênticos.

Verificado na resposta de `next start`: os seis headers presentes tanto no HTML
de `/blog` quanto no asset `/blog/blog-data/posts-index.json`.

### 2. Um container GTM, duas zonas — e a origem é o que faz funcionar

O blog monta `<GoogleTagManager gtmId="GTM-W48GGZQP" />`, o **mesmo** container
do storefront. Cada travessia de zona é um documento novo (hard navigation),
então o componente precisa ser montado nas duas — não há SPA que carregue o
script uma vez só.

Mas o **estado de consent é um só**: o Silktide grava em cookie/localStorage, e
as duas zonas compartilham a origem porque o storefront reproxeia `/blog` sob o
mesmo domínio. O usuário não vê o banner duas vezes. Montar container diferente,
ou não compartilhar a origem, seria o bug.

**Onde a origem compartilhada aparece na prática.** O container do GTM referencia
os scripts do Silktide por **URL absoluta do domínio de produção**
(`https://fast-commerce-ten.vercel.app/consent/silktide-consent-manager.js`).
Em produção, tanto `/` quanto `/blog/*` são servidos desse domínio, então o
script é same-origin e `'self'` autoriza nas duas zonas — é literalmente a mesma
diretiva cobrindo as duas.

Em desenvolvimento local o console acusa o bloqueio:

```
Loading the script 'https://fast-commerce-ten.vercel.app/consent/silktide-consent-manager.js'
violates the following Content Security Policy directive: "script-src 'self' ..."
```

**Importante não tirar a conclusão errada disso.** Medido: a home do storefront
em `localhost:3000` acusa **6** violações desse tipo; o blog, **2**. Ou seja, o
bloqueio é um artefato de `localhost` **não ser** o domínio de produção, e atinge
as duas zonas igualmente — não é sintoma de a zona blog estar isolada nem de a
CSP do blog estar errada. Servido através do host em `:3000`, o blog se comporta
exatamente como o storefront.

O que a arquitetura garante continua valendo, e é o ponto do ADR: **o consent
compartilhado depende da origem compartilhada**, e é o rewrite do host que
produz essa origem única em produção. O que *não* se pode fazer é validar
consent em dev local — nem no blog, nem no storefront.

### 3. Sanitização do markdown no build, com duas barreiras

O `body` gerado pelo faker é markdown e vira HTML **no build**, nunca em runtime.
A cadeia (`remark-parse` → `remark-rehype` → `rehype-sanitize` →
`rehype-stringify`) roda em `scripts/generate-posts.ts`, e `data/posts.json` já
guarda HTML auditado. Em runtime não existe markdown, nem parser, nem conversão.

Duas barreiras independentes:

| Barreira | O que fecha |
| --- | --- |
| `remark-rehype` | Descarta nós de HTML cru (`allowDangerousHtml` fica em `false`). `<script>` escrito no corpo não vira nó. |
| `rehype-sanitize` | Whitelist de tags/atributos e **validação de esquema de URL**. |

A segunda é a que importa de verdade, e o motivo é preciso: um link markdown
`[x](javascript:alert(1))` é **sintaxe markdown 100% legítima**. Ele atravessa a
primeira barreira intacto, porque não é HTML cru. É `rehype-sanitize` quem o
remove.

Por isso o gerador **planta um fixture**: a cada 500 posts, um link com esquema
`javascript:`. O HTML resultante é `<a>link de teste</a>` — a tag sobrevive, o
`href` não. E `scripts/verify-posts.ts` falha o build se `javascript:`,
`<script` ou um atributo `on*=` aparecerem em qualquer um dos 10.000 posts.

O conteúdo hoje é "confiável" — nós mesmos geramos. A barreira existe porque "a
fonte é confiável" é uma premissa que envelhece mal. Mesmo espírito do ADR 0004
do storefront: fechar o vetor antes que ele exista.

### 4. Rate limiting: não necessário, e por um motivo estrutural

O storefront precisou de rate limit (ADR 0014) porque listagem e busca eram
`force-dynamic` — havia route handler a inundar. O blog **elimina a classe
inteira do problema**: não há route handler, não há endpoint de paginação (o
índice é um único asset), e tudo é servido do edge. Contraste explícito, não
omissão.

### 5. Sentry: fora do escopo desta zona

O ADR 0002 do storefront registrou como lacuna que `connect-src` não autoriza
`ingest.us.sentry.io`. Aqui a lacuna não se aplica porque **o blog não usa
Sentry**: a zona é 100% estática, sem servidor a instrumentar. Se um dia entrar
(para erros de cliente), a origem precisa ser adicionada ao `connect-src` **de
saída** — é a correção que o storefront ainda deve.

## Consequências

**Positivas**

- CSP e security headers idênticos nas duas zonas, verificados na resposta real.
- O banner de consent não aparece duas vezes na travessia.
- Nenhuma origem extra precisou ser aberta para o blog funcionar — as decisões de
  `assetPrefix` e de índice estático pagaram esse dividendo.
- XSS por markdown fechado no build, com teste que falha o CI.

**Negativas / limitações aceitas**

- **A CSP está duplicada em dois arquivos que fazem deploy separado.** Nada
  impede que divirjam. Não há hoje teste automatizado comparando as duas
  políticas; a verificação é manual (securityheaders.com nas duas zonas) e é o
  ponto mais frágil desta decisão.
- `'unsafe-inline'` em `script-src` e `style-src`, herdado — é o preço de não usar
  nonce, e a razão está no ADR 0002.
- **O consent não é validável em desenvolvimento local, em nenhuma das duas
  zonas**, porque o container do GTM aponta para o domínio de produção. Validar
  exige um ambiente servido pelo domínio real.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| CSP só no host (storefront) | Não funciona: cada zona serve suas próprias respostas, e o `headers()` do host não alcança o que o blog responde. |
| Container GTM separado para o blog | Duplicaria o banner de consent e partiria a analytics em dois, sem ganho nenhum — a origem já é a mesma. |
| Sanitizar em runtime | Pagaria parse e sanitização a cada render de post, para um conteúdo que nunca muda. Build-time é grátis por definição. |
| Confiar que "o conteúdo é nosso" | O `href` `javascript:` do fixture mostra que markdown sozinho já é um vetor. A premissa de confiança envelhece mal. |
| `dangerouslySetInnerHTML` com markdown convertido sem sanitizar | É literalmente o vetor. O `dangerouslySetInnerHTML` que existe hoje recebe HTML já auditado no build. |
