'use client';

/*
 * O ÚNICO Client Component da casca inteira. Todo o resto — mega menu, busca,
 * o próprio `<details>` do menu mobile — é HTML e CSS, e roda sem JS.
 *
 * O que ele faz: fecha o `<details>` ancestral quando um link do painel é
 * clicado. Toda navegação daqui é `<a href>` — hard navigation, inclusive entre
 * zonas (ver Blog-0001) — então o documento novo já nasceria com o `<details>`
 * fechado. Isto NÃO conserta um bug: só evita que o painel fique aberto por cima
 * da página durante o tempo de carga.
 *
 * Por que sobreviveu à migração, se não conserta bug: o custo é este arquivo, e
 * em conexão lenta o painel aberto sobre a página nova é visível. Dropar era a
 * alternativa (casca 100% server, zero JS); mantivemos porque alguns KB numa
 * zona só é barato demais para valer a regressão.
 *
 * Por que `closest('details')` em vez de um `ref`: o `<details>` é renderizado
 * no SERVIDOR, no componente pai. Um `ref` exigiria que o pai também fosse
 * Client Component — exatamente o que este arquivo existe para evitar.
 *
 * CRÍTICO: as colunas de categoria entram aqui como `children`, nunca como
 * prop de dados. `children` de um Client Component é renderizado no servidor e
 * chega como árvore já pronta; passar `departments` como prop os faria
 * atravessar SERIALIZADOS no payload RSC de toda página — a regressão que a
 * migração para Server Components existe para eliminar.
 */

export function MobileMenuAutoClose({
  children,
  ...rest
}: React.ComponentPropsWithoutRef<'nav'>) {
  return (
    <nav
      {...rest}
      onClick={(event) => {
        const details = (event.target as HTMLElement | null)?.closest('a')?.closest('details');
        if (details) details.open = false;
      }}
    >
      {children}
    </nav>
  );
}
