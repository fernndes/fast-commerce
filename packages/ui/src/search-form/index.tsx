import { accent, border, focusRing, fgText, inputBg } from '../tokens';

/*
 * A busca. `<form action="/busca" method="get">` puro: submete com JS
 * desabilitado, o termo vira `?q=` na URL, e o resultado é uma página com
 * endereço próprio — compartilhável e indexável. Não há `onSubmit`, e é por isso
 * que nada aqui precisa de `'use client'`.
 *
 * O `<label>` é visualmente escondido (`sr-only`), não ausente: `placeholder`
 * não é nome acessível.
 */

type Props = {
  action?: string;
  /**
   * `id` do input, usado pelo `htmlFor` do label. É prop porque o `id` vive na
   * cascata global agora que não há Shadow DOM — dois formulários de busca na
   * mesma página colidiriam. Hoje só existe um (o do header), mas o default
   * estar nomeado deixa o conserto óbvio se um segundo aparecer.
   */
  inputId?: string;
  className?: string;
};

export function SearchForm({
  action = '/busca',
  inputId = 'app-header-search',
  className,
}: Props) {
  return (
    <form
      action={action}
      method="get"
      role="search"
      className={`grid min-w-0 grid-cols-[1fr_auto] items-center ${className ?? ''}`}
    >
      <label htmlFor={inputId} className="sr-only">
        Buscar
      </label>
      <input
        id={inputId}
        name="q"
        type="search"
        placeholder="Buscar produtos"
        className={`h-9 min-w-0 rounded-l-md border px-3 font-[inherit] ${border} ${inputBg} ${fgText} ${focusRing}`}
      />
      <button
        type="submit"
        className={`h-9 cursor-pointer rounded-r-md border px-[0.8rem] font-[inherit] text-sm ${accent} ${focusRing}`}
      >
        Buscar
      </button>
    </form>
  );
}
