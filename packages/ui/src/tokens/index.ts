/*
 * Os tokens de cor da casca, agora como STRINGS DE CLASSE Tailwind.
 *
 * No desenho anterior (Shadow DOM) eles eram custom properties no `:host`, e o
 * bloco de dark mode redefinia só os tokens em vez de repetir cada seletor. Sem
 * Shadow DOM esse mecanismo some, mas o problema que ele resolvia não: com mega
 * menu e barra de categorias, o número de elementos que precisa de cor é grande
 * o bastante para que repetir `dark:` em cada um seja como este código passa a
 * divergir de si mesmo.
 *
 * A saída equivalente aqui é constante de módulo. Os valores são os MESMOS
 * hexadecimais/rgba do CSS antigo, escritos como arbitrary values, e não os
 * aliases do Tailwind — a paleta zinc coincide, mas depender da coincidência
 * faria a casca mudar de cor se a escala do Tailwind mudasse.
 *
 * Importante para a purga: o Tailwind extrai classes por regex sobre o texto do
 * arquivo, então estas constantes são encontradas normalmente — desde que
 * `@source` aponte para `src` do pacote (ver o `globals.css` de cada zona).
 */

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

/**
 * O anel de foco visível. Era uma regra única no CSS do Shadow DOM
 * (`a:focus-visible, button:focus-visible, ...`); sem shadow root não há mais
 * onde escrever "todos os focáveis daqui dentro", então cada elemento focável
 * da casca aplica esta constante explicitamente.
 */
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18181b] dark:focus-visible:outline-[#fafafa]';

/**
 * O trilho de conteúdo: mesma largura (80rem) das utilities `page-*` das zonas.
 * Não usamos `page-shell` de propósito — a calha da casca é fixa em 1rem, sem o
 * degrau para 1.5rem em `sm`, e herdar a utility da zona amarraria o pacote a um
 * CSS que ele não controla.
 */
export const railWidth = 'box-border mx-auto w-[min(100%,80rem)]';
