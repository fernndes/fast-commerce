// Os tokens de cor da casca, como STRINGS DE CLASSE Tailwind — ver ui-0001
// (adr/0001-primitivas-sem-shadow-dom-tokens-como-classes.md), §4.

/** Texto principal. */
export const fgText = 'text-[#18181b] dark:text-[#fafafa]';

/** Texto secundário — links de coluna, nav, itens em destaque. */
export const mutedText = 'text-[#52525b] dark:text-[#a1a1aa]';

/** Alvo de hover do texto secundário: ele sobe para a cor principal. */
export const fgTextHover = 'hover:text-[#18181b] dark:hover:text-[#fafafa]';

/** Bordas e divisores. */
export const border = 'border-[rgba(24,24,27,0.12)] dark:border-[rgba(250,250,250,0.16)]';

/** Fundo de hover de alvos clicáveis quadrados (ações, summary, nav). */
export const hoverBg = 'hover:bg-[rgba(24,24,27,0.06)] dark:hover:bg-[rgba(250,250,250,0.1)]';

/** Mesmo fundo do hover, aplicado por estado em vez de por ponteiro. */
export const currentBg =
  'aria-[current=page]:bg-[rgba(24,24,27,0.06)] dark:aria-[current=page]:bg-[rgba(250,250,250,0.1)]';

/**
 * Painéis são OPACOS: eles cobrem o conteúdo da página. Só a barra é
 * translúcida (ver `barBg`).
 */
export const surfaceBg = 'bg-white dark:bg-[#09090b]';

export const barBg = 'bg-[rgba(255,255,255,0.92)] dark:bg-[rgba(9,9,11,0.9)]';

export const inputBg = 'bg-[#fafafa] dark:bg-[#18181b]';

/** Botão de busca: inverte fundo e texto. */
export const accent =
  'border-[#18181b] bg-[#18181b] text-white dark:border-[#fafafa] dark:bg-[#fafafa] dark:text-[#18181b]';

export const panelShadow =
  'shadow-[0_20px_25px_-5px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.5)]';

/** O anel de foco visível, aplicado explicitamente por elemento — ver ui-0001, §4. */
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18181b] dark:focus-visible:outline-[#fafafa]';

/** O trilho de conteúdo — largura própria, não herdada de `page-shell` — ver ui-0001, §5. */
export const railWidth = 'box-border mx-auto w-[min(100%,80rem)]';
