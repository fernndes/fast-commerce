'use client';

import { useEffect, useId, useState } from 'react';

/**
 * Autocomplete do header — a ilha client prometida no docblock do
 * `<SearchForm>`: envolve APENAS o `<input>`, não o formulário. O header
 * continua Server Component, e a busca continua funcionando sem JS, porque o
 * input segue dentro do `<form method="get">` com `name="q"`.
 *
 * As sugestões saem de `<datalist>`, o widget nativo: o browser cuida do
 * dropdown, do teclado e da acessibilidade. Um dropdown próprio custaria
 * ~10x mais código para reimplementar (mal) o que o HTML já faz — e este
 * componente é carregado em TODA página.
 */
export function SearchSuggestions({ className = '' }: { className?: string }) {
  const listId = useId();
  const [term, setTerm] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Termo curto demais não sugere nada — e isso é DERIVADO do termo, não um
  // `setSuggestions([])` dentro do efeito. Limpar por efeito custaria um
  // render em cascata a cada tecla, que é justamente o que a regra
  // `react-hooks/set-state-in-effect` existe para evitar.
  const visible = term.trim().length >= 2 ? suggestions : [];

  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) return;

    // `AbortController` para a resposta lenta de "sha" não sobrescrever a
    // resposta rápida de "shampoo" — a corrida clássica de autocomplete.
    const controller = new AbortController();

    // Debounce: sem ele, "shampoo" dispara 7 requests. 200 ms é abaixo do
    // intervalo entre teclas de quem digita depressa.
    const timer = setTimeout(() => {
      fetch(`/api/busca/sugestoes?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : { suggestions: [] }))
        .then((data: { suggestions: string[] }) => setSuggestions(data.suggestions))
        // Busca que falha não é erro de usuário: o campo continua funcionando
        // como campo de busca comum, só sem sugestão. `abort` cai aqui também.
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
