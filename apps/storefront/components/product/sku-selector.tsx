'use client';

import { useState } from 'react';

import type { Sku } from '@/lib/catalog';
import { toBRL, toPercent } from '@/lib/format';

// Seletor de variação da PDP — a única ilha client da página. Ver ADR 0009
// (adr/0009-fronteira-server-client-e-acessibilidade.md).
export function SkuSelector({ items, optionType }: { items: Sku[]; optionType: string }) {
  // Abre no SKU disponível mais barato; sem estoque, cai no primeiro. Ver ADR 0009.
  const [selectedId, setSelectedId] = useState(() => {
    const purchasable = items.filter((item) => item.offer.availableQuantity > 0);
    const pool = purchasable.length > 0 ? purchasable : items;
    return pool.reduce((cheap, item) => (item.offer.price < cheap.offer.price ? item : cheap))
      .itemId;
  });

  const selected = items.find((item) => item.itemId === selectedId) ?? items[0];
  const { listPrice, price, availableQuantity } = selected.offer;
  const discount = listPrice > price ? (listPrice - price) / listPrice : 0;

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {/* `optionType` é 'peso' ou 'tamanho' — o rótulo é dado, não chute. */}
          Escolha o {optionType}
        </legend>

        <div className="flex flex-wrap gap-2">
          {items.map((item) => {
            const soldOut = item.offer.availableQuantity === 0;
            const active = item.itemId === selected.itemId;

            return (
              <label
                key={item.itemId}
                className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 ${
                  active
                    ? 'border-zinc-950 font-semibold dark:border-zinc-50'
                    : 'border-black/15 hover:border-black/40 dark:border-white/20 dark:hover:border-white/50'
                } ${soldOut ? 'text-zinc-400 line-through dark:text-zinc-600' : ''}`}
              >
                <input
                  type="radio"
                  name="sku"
                  value={item.itemId}
                  checked={active}
                  onChange={() => setSelectedId(item.itemId)}
                  // `sr-only`, não `hidden`: input continua focável/anunciável. Ver ADR 0009.
                  className="sr-only"
                />
                {item.option}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1">
        <p className="flex flex-wrap items-baseline gap-x-2">
          {discount > 0 && (
            <span className="text-sm text-zinc-500 line-through">{toBRL(listPrice)}</span>
          )}
          <span className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            {toBRL(price)}
          </span>
          {discount > 0 && (
            <span className="rounded-md bg-emerald-700 px-1.5 py-0.5 text-xs font-semibold text-white">
              -{toPercent(discount)}%<span className="sr-only"> de desconto</span>
            </span>
          )}
        </p>

        <p className="text-sm text-zinc-500">
          SKU {selected.sku} ·{' '}
          {availableQuantity > 0 ? `${availableQuantity} em estoque` : 'Indisponível'}
        </p>
      </div>

      <button
        type="button"
        disabled={availableQuantity === 0}
        // TODO: a rota /carrinho ainda não existe — o botão prova a troca de
        // SKU, não o checkout.
        className="w-full rounded-lg bg-zinc-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300 sm:w-auto dark:bg-zinc-50 dark:text-zinc-950 dark:disabled:bg-zinc-700"
      >
        {availableQuantity > 0 ? 'Adicionar ao carrinho' : 'Esgotado'}
      </button>
    </div>
  );
}
