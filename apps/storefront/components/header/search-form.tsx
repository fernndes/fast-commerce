import { SearchSuggestions } from '@/components/header/search-suggestions';

/**
 * Busca sem JS: um `<form method="get">` apontando para a rota `/busca`. O
 * browser monta `?q=...` e navega sozinho — nenhum `onSubmit`, nenhum
 * `router.push`.
 *
 * Trade-off assumido: é uma navegação completa, não uma transição client-side.
 * Para uma busca isso é aceitável — o destino é uma página, não um estado de UI.
 *
 * O autocomplete chegou e cumpriu o que este comentário prometia: é a ilha
 * `<SearchSuggestions>`, que envolve SÓ o `<input>`. Este componente continua
 * server, o `<form>` continua HTML puro, e a busca continua funcionando com o
 * JS desligado — a sugestão é enfeite, não o mecanismo.
 */
export function SearchForm({ className = '' }: { className?: string }) {
  return (
    <form action="/busca" method="get" role="search" className={`min-w-0 flex-1 ${className}`}>
      <label className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 focus-within:border-transparent focus-within:outline-2 focus-within:outline-offset-0 dark:border-white/15">
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          className="size-4 shrink-0 fill-none stroke-current stroke-[1.5] text-zinc-500"
        >
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5L14 14" strokeLinecap="round" />
        </svg>
        <span className="sr-only">Buscar produtos</span>
        <SearchSuggestions className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-zinc-500" />
      </label>
    </form>
  );
}
