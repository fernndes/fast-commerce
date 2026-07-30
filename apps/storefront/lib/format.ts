/**
 * Formatação de preço. Todo valor monetário do catálogo é INTEIRO EM CENTAVOS
 * (`offer.listPrice`, `offer.price`, `priceFrom`) — nunca float. A conversão
 * para reais acontece só na hora de exibir, aqui.
 *
 * O `Intl.NumberFormat` é criado uma vez por processo: instanciar um por card
 * numa grade de 24 produtos é caro à toa.
 */
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const toBRL = (cents: number) => brl.format(cents / 100);

/** Percentual inteiro de desconto, para o selo. `0.35` → `35`. */
export const toPercent = (fraction: number) => Math.round(fraction * 100);
