import type { SortKey } from '@/lib/catalog';

/** Só os recortes que fazem sentido oferecer ao usuário — `stock-asc` é uso interno. */
const OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'relevance', label: 'Relevância' },
  { value: 'price-asc', label: 'Menor preço' },
  { value: 'price-desc', label: 'Maior preço' },
  { value: 'discount', label: 'Maior desconto' },
  { value: 'newest', label: 'Novidades' },
  { value: 'name', label: 'Nome (A–Z)' },
];

/**
 * Ordenação sem JS, no mesmo espírito do `<SearchForm>`: um `<form
 * method="get">` com um `<select name="sort">` e um botão de aplicar. O
 * browser monta a query string e navega.
 *
 * O `<button>` existe porque sem JS um `<select>` não submete sozinho. Um
 * `onChange` seria mais fluido e custaria transformar isto numa ilha client
 * presente em três páginas de listagem — não paga.
 *
 * Os campos escondidos preservam o resto da query (`q`, filtros): sem eles,
 * ordenar uma busca jogaria o termo fora.
 */
export function SortSelect({
  action,
  current,
  hidden = {},
}: {
  action: string;
  current: SortKey;
  hidden?: Record<string, string | undefined>;
}) {
  return (
    <form action={action} method="get" className="flex items-center gap-2">
      {Object.entries(hidden).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}

      <label className="flex items-center gap-2 text-sm text-zinc-500">
        Ordenar por
        <select
          name="sort"
          defaultValue={current}
          className="rounded-lg border border-black/10 bg-transparent px-2 py-1.5 text-sm text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-0 dark:border-white/15 dark:text-zinc-50"
        >
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-white/15 dark:hover:bg-white/10"
      >
        Aplicar
      </button>
    </form>
  );
}
