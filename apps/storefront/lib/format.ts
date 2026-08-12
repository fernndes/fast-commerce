// Formatação de preço. Valores do catálogo são inteiros em centavos — ver ADR 0005.
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const toBRL = (cents: number) => brl.format(cents / 100);

/** Percentual inteiro de desconto, para o selo. `0.35` → `35`. */
export const toPercent = (fraction: number) => Math.round(fraction * 100);
