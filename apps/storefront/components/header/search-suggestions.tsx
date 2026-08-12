'use client';

import { useEffect, useId, useState } from 'react';

// Autocomplete do header — envolve só o `<input>`. Ver ADR 0009
// (adr/0009-fronteira-server-client-e-acessibilidade.md).
export function SearchSuggestions({ className = '' }: { className?: string }) {
  const listId = useId();
  const [term, setTerm] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Derivado do termo, não `setSuggestions([])` num efeito — ver ADR 0009.
  const visible = term.trim().length >= 2 ? suggestions : [];

  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) return;

    // Evita a corrida clássica de autocomplete (resposta lenta sobrescrever a rápida). Ver ADR 0009.
    const controller = new AbortController();

    // Debounce de 200ms — ver ADR 0009.
    const timer = setTimeout(() => {
      fetch(`/api/busca/sugestoes?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : { suggestions: [] }))
        .then((data: { suggestions: string[] }) => setSuggestions(data.suggestions))
        // Falha degrada para campo de busca comum, sem sugestão. Ver ADR 0009.
        .catch(() => {});
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  return (
    <>
      <input
        type="search"
        name="q"
        placeholder="Buscar produtos"
        autoComplete="off"
        list={listId}
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        className={className}
      />
      <datalist id={listId}>
        {visible.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
    </>
  );
}
